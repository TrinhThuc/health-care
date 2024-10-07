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

async function getMealSchedule({
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
    const mealScheduleService = new ItemsService('meal_schedule', {
        accountability: req.accountability,
        schema: req.schema,
    });
    const mealScheduleConfigService = new ItemsService('meal_schedule_config', {
        accountability: req.accountability,
        schema: req.schema,
    }); 

    const nutritionCatalogService = new ItemsService('nutrition_catalog', {
        accountability: req.accountability,
        schema: req.schema,
    });
    try {
        const currentUserId = req.accountability.user;
        let dateReq = req.query.date;
        if (!dateReq) {
            dateReq = new Date();
        } else {
            dateReq = new Date(dateReq);
        }
        const startOfDay = new Date(dateReq);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateReq);
        endOfDay.setHours(23, 59, 59, 999);


        const mealScheduleConfigs = await mealScheduleConfigService.readByQuery({
            fields: ["*"]
        });

        const nutritionCatalogs = await nutritionCatalogService.readByQuery({
            fields: ["*"]
        });

        const mealSchedules = await mealScheduleService.readByQuery({
            fields: ["*", "dish_id.id", "dish_id.name", "dish_id.description", "dish_id.image",
                "dish_id.nutritions.value", "dish_id.nutritions.unit",
                "dish_id.nutritions.nutrition_id.code", "dish_id.nutritions.nutrition_id.name"
            ],
            sort: ['meal_time'],
            filter: {
                _and: [{
                        user_id: {
                            _eq: currentUserId
                        }
                    },
                    {
                        meal_time: {
                            _gte: startOfDay
                        }
                    },
                    {
                        meal_time: {
                            _lte: endOfDay
                        }
                    }
                ]
            }
        });
        let mealScheduleRes;
        if (mealSchedules && mealSchedules.length != 0) {
            mealScheduleRes = await mergeMealWithSchedule(mealScheduleConfigs, mealSchedules);
            // const meals = mealScheduleRes.flatMap((meal) => meal.meals);
            // const mealNutritions = await getAllNutritions(meals);
            // logger.info(mealNutritions);
            // nutritionCatalogs
        }

        res.status(200).json({
            data: mealScheduleRes

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

// Hàm chuyển đổi từ chuỗi "HH:mm:ss" thành đối tượng Date
const parseTime = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0); // Thiết lập giờ, phút, giây và mili giây
    return date;
};

// Hàm chính để ghép các meal_schedule vào schedule_config tương ứng
async function mergeMealWithSchedule(scheduleConfig, mealSchedule) {
    return scheduleConfig.map((config) => {
        // Chuyển đổi from_time và to_time của scheduleConfig sang đối tượng Date
        const fromTime = parseTime(config.from_time);
        const toTime = parseTime(config.to_time);

        // Tìm các meal_schedule có meal_time nằm trong khoảng from_time và to_time
        const meals = mealSchedule.filter((meal) => {
            const mealTime = new Date(meal.meal_time); // Chuyển đổi meal_time sang đối tượng Date

            // So sánh chỉ phần giờ, phút và giây
            const mealHours = mealTime.getHours();
            const mealMinutes = mealTime.getMinutes();
            const mealSeconds = mealTime.getSeconds();

            const isAfterFromTime =
                mealHours > fromTime.getHours() ||
                (mealHours === fromTime.getHours() && mealMinutes > fromTime.getMinutes()) ||
                (mealHours === fromTime.getHours() && mealMinutes === fromTime.getMinutes() && mealSeconds >= fromTime.getSeconds());

            const isBeforeToTime =
                mealHours < toTime.getHours() ||
                (mealHours === toTime.getHours() && mealMinutes < toTime.getMinutes()) ||
                (mealHours === toTime.getHours() && mealMinutes === toTime.getMinutes() && mealSeconds <= toTime.getSeconds());

            // Kiểm tra nếu mealTime nằm trong khoảng fromTime và toTime
            return isAfterFromTime && isBeforeToTime;
        });
        console.log(config);
        console.log(meals);

        // Ghép các meal_schedule tìm được vào scheduleConfig hiện tại
        return {
            ...config,
            meals
        };
    });
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

	router.get('/meal_schedule', async (req, res) => {
		await getMealSchedule({
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
