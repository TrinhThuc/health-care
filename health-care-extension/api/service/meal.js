import {
    ForbiddenError,
    InvalidPayloadError,
    InvalidQueryError
} from '@directus/errors';
let Logger;
export async function getMealSchedule({
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
            dateReq = new Date(`${dateReq}T00:00:00.000Z`);
        }
        const startOfDay = new Date(Date.UTC(
            dateReq.getUTCFullYear(),
            dateReq.getUTCMonth(),
            dateReq.getUTCDate()
        ));
        
        const endOfDay = new Date(Date.UTC(
            dateReq.getUTCFullYear(),
            dateReq.getUTCMonth(),
            dateReq.getUTCDate(),
            23, 59, 59, 999
        ));

        console.log(startOfDay);
        console.log(endOfDay);




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
            error.status = 503
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

async function getAllNutritions(meals) {
    // Duyệt qua từng phần tử trong meals và lấy ra danh sách nutritions của từng dish_id
    const nutritionsList = meals
        .filter((meal) => meal.dish_id && meal.dish_id.nutritions) // Lọc các meal có nutritions hợp lệ
        .flatMap((meal) => meal.dish_id.nutritions); // Gộp tất cả các nutritions vào một danh sách

    return nutritionsList;
}