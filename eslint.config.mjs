import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		ignores: ['dist/**', '.test-dist/**', 'release/**', 'tools/**', 'test/**'],
	},
];
