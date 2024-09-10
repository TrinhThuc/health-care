import {
	getBmi
} from "../service/user"

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
};