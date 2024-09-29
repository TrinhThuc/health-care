async function getBmi({
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
    const userService = new ItemsService('directus_users', {
        accountability: req.accountability,
        schema: req.schema,
    });
    try {
        const currentUser = await userService.readOne(req.accountability.user);
        logger.info(currentUser);

        const height = currentUser.height;
        const weight = currentUser.weight;
        let bmi = 0;
        if (height && weight) {
            bmi = weight / (height * height);
        }
        res.status(200).json({
            data: {
                bmi: bmi.toFixed(1)
            }
        });
    } catch (error) {
        if (!error.status) {
            error.status = 503;
        }
        res.status(error.status).json({
            error: error,
            message: error.message
        });
    }
}

const DIFFICULTY_DEFAULT = "EASY";
async function getWorkoutDetail({
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
    new ItemsService('directus_users', {
        accountability: req.accountability,
        schema: req.schema,
    });
    const workoutService = new ItemsService('workout', {
        accountability: req.accountability,
        schema: req.schema,
    });
    const workoutScheduleService = new ItemsService('workout_schedule', {
        accountability: req.accountability,
        schema: req.schema,
    });
    try {
        logger.info(req);
        const workoutId = req.params.id;
        const currentUserId = req.accountability.user;
        let difficulityReq = req.query.difficulity;
        if (!difficulityReq) {
            difficulityReq = DIFFICULTY_DEFAULT;
        }
        const workout = await workoutService.readOne(workoutId, {
            fields: ["*", "equipments.value", "equipments.equipment_id.*", "exercises.unit", "exercises.set_number", "exercises.exercise_id.*", "exercises.exercise_id.exercise_difficulties.value", "exercises.exercise_id.exercise_difficulties.calories_burn", "exercises.exercise_id.exercise_difficulties.excercise_time", "exercises.exercise_id.exercise_difficulties.difficulty_id.code"],
            deep: {
                exercises: {
                    exercise_id: {
                        exercise_difficulties: {
                            _filter: {
                                difficulty_id: {
                                    code: {
                                        _eq: difficulityReq,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        let exercises = workout.exercises;
        let total_exercise = 0;
        let total_exercise_time = 0;
        let total_calories_burn = 0;
        if (exercises || exercises.length == 0) {
            total_exercise = exercises.length;
            exercises = exercises.map(item => item.exercise_id);
            const exerciseDifficulties = exercises.flatMap(item => item.exercise_difficulties || []);
            logger.info(exerciseDifficulties);
            total_calories_burn = exerciseDifficulties
                .reduce((total, difficulty) => total + difficulty.calories_burn, 0);
            total_exercise_time = exerciseDifficulties
                .reduce((total, difficulty) => total + difficulty.excercise_time, 0);
        }

        workout["total_exercise"] = total_exercise;
        workout["total_exercise_time"] = total_exercise_time;
        workout["total_calories_burn"] = total_calories_burn;

        const currentTime = new Date();
        const workoutSchedule = await workoutScheduleService.readByQuery({
            fields: ["*"],
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
            limit: 1
        });
        workout["workout_schedule"] = workoutSchedule;
        res.status(200).json({
            data: workout
        });
    } catch (error) {
        if (!error.status) {
            error.status = 503;
        }
        res.status(error.status).json({
            error: error,
            message: error.message
        });
    }
}

var index = (router, {
	services,
	database,
	getSchema,
	env,
	logger,
	emitter
}) => {
	router.get('/users/bmi', async (req, res) => {
		await getBmi({
			req,
			res
		}, {
			services,
			database,
			getSchema,
			env,
			logger,
			emitter
		});
	});

	router.get('/workouts/:id', async (req, res) => {
		await getWorkoutDetail({
			req,
			res
		}, {
			services,
			database,
			getSchema,
			env,
			logger,
			emitter
		});
	});
};

export { index as default };
