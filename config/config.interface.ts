import { Configuration } from '../src/shared/configuration/configuration.enum';

export type Config = {[key in Configuration]: string};
