import {
	getBmi
} from "../service/user";

import {
	getWorkoutDetail
} from "../service/workout";

import {
	getMealSchedule
} from "../service/meal";

import {
	getLatest, getNearest
} from "../service/activity";

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

	router.get('/activity/latest', async (req, res) => {
		await getLatest({
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
	
	router.get('/activity/nearest', async (req, res) => {
		await getNearest({
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