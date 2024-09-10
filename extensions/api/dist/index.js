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
};

export { index as default };
