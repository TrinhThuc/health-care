import {
    ForbiddenError,
    InvalidPayloadError,
    InvalidQueryError
} from '@directus/errors';
let Logger;
const LIMIT_DEFAULT = 5;
export async function getLatest({
    req,
    res
}, {
    services,
    database,
    getSchema,
    env,
    logger,
    emitter
}) {
    const {
        ItemsService
    } = services;
    Logger = logger;

    const mealScheduleService = new ItemsService('meal_schedule', {
        accountability: req.accountability,
        schema: req.schema,
    });
    const workoutScheduleService = new ItemsService('workout_schedule', {
        accountability: req.accountability,
        schema: req.schema,
    });
    try {
        const currentUserId = req.accountability.user;
        let limit = req.query.limit ? req.query.limit : LIMIT_DEFAULT;
        const currentTime = new Date();
        currentTime.setHours(currentTime.getHours() + 7);
        console.log(currentTime);
        const workoutSchedules = await workoutScheduleService.readByQuery({
            fields: ["*", "workout_id.*"],
            filter: {
                _and: [{
                        user_id: {
                            _eq: currentUserId
                        }
                    },
                    {
                        scheduled_execution_time: {
                            _gte: currentTime
                        }
                    }
                ]
            },
            sort: ['-scheduled_execution_time'],
            limit: 5
        });
        const updatedWorkoutSchedules = workoutSchedules.map(schedule => ({
            ...schedule,
            type: 'WORKOUT'
        }));

        const mealSchedules = await mealScheduleService.readByQuery({
            fields: ["*", "dish_id.*"],
            sort: ['-meal_time'],
            filter: {
                _and: [{
                        user_id: {
                            _eq: currentUserId
                        }
                    },
                    {
                        meal_time: {
                            _lte: currentTime
                        }
                    }
                ]
            }
        });
        const updatedmealSchedules = mealSchedules.map(meal => ({
            ...meal,
            type: 'MEAL'
        }));

        const combinedSchedules = [...updatedWorkoutSchedules, ...updatedmealSchedules];
        const sortedSchedules = combinedSchedules.sort((a, b) => {
            const timeA = a.scheduled_execution_time || a.meal_time;
            const timeB = b.scheduled_execution_time || b.meal_time;
            return new Date(timeB) - new Date(timeA);
        });
        const nearestSchedules = sortedSchedules.slice(0, limit);
        res.status(200).json({
            data: nearestSchedules
        });
    } catch (error) {
        if (!error.status) {
            error.status = 503
        }
        res.status(error.status).json({
            error: error,
            message: error.message
        });
    }
}