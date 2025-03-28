import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class PasswordStrengthConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    return (
      /[A-Z]/.test(password) && // At least one uppercase letter
      /[a-z]/.test(password) && // At least one lowercase letter
      /[0-9]/.test(password) && // At least one number
      /[\W_]/.test(password) // At least one special character
    );
  }

  defaultMessage() {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: PasswordStrengthConstraint,
    });
  };
}
