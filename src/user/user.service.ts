import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IFirebaseUser } from '../firebase/firebase-user.interface';
import { UserRepository } from './user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { formatUserObject } from '../utils/constants';
import { GetUserDto } from './dtos/get-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
  ) {}

  public async getUser({ uid }: IFirebaseUser): Promise<GetUserDto | undefined> {
    const queryResult = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.partnerAccess', 'partnerAccess')
      .leftJoinAndSelect('partnerAccess.partner', 'partner')
      .where('user.firebaseUid = :uid', { uid })
      .getOne();

    if (!queryResult) {
      throw new HttpException('NOT FOUND', HttpStatus.NOT_FOUND);
    }

    return formatUserObject(queryResult);
  }
}
