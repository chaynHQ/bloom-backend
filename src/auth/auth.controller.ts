import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserAuthDto } from './dto/user-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // This api is to be removed in the future.
  @Post('/signin')
  async signin(@Body() userAuthDto: UserAuthDto) {
    return this.authService.loginFirebaseUser(userAuthDto);
  }
}
