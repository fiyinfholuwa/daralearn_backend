import { Controller, Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get()
  getUser() {
    return {
      status: true,
      data: [
        {
          id: 1,
          name: 'olasope',
        },
        {
          id: 2,
          name: 'daramola',
        },
      ],
    };
  }
}
