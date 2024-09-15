import {
	getBmi
} from "../service/user";

import {
	getWorkoutDetail
} from "../service/workout";

export default (router, {
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