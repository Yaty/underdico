import { registerDecorator, ValidationOptions } from 'class-validator';

import * as ISO6391 from 'iso-639-1';

interface Iso6391ValidationOptions extends ValidationOptions {
  optional?: boolean;
}

export function IsIso6391(validationOptions?: Iso6391ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(locale: any) {
          if (!locale && validationOptions.optional) {
            return true;
          }

          // @ts-ignore
          return ISO6391.validate(locale);
        },

        defaultMessage(): string {
          return 'The locale must respect ISO-639-1 standard';
        },
      },
    });
  };
}
