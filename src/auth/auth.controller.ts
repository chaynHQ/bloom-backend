import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserAuthDto } from './dto/user-auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // This api is to be removed in the future.
  @Post('/signin')
  @ApiExcludeEndpoint()
  async signin(@Body() userAuthDto: UserAuthDto) {
    return this.authService.loginFirebaseUser(userAuthDto);
  }
}
