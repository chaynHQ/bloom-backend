import { ApiConsumes, ApiProduces, ApiResponse } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ControllerDecorator() {
  return applyDecorators(
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({ status: 201, description: 'The record has been successfully created.' }),
    ApiResponse({ status: 400, description: 'Incorrect payload sent.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 403, description: 'Forbidden.' }),
    ApiResponse({ status: 500, description: 'Internal Server Error.' }),
  );
}
