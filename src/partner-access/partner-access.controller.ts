import { Controller, Post } from '@nestjs/common';

@Controller('/v1/partner-access')
export class PartnerAccessController {
  @Post('/generate')
  generatePartnerAccessCode(): string {
    return 'Hello';
  }
}
