import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserActivity, UserActivitySchema } from './schemas/user-activity.schema';
import { UserActivitiesService } from './user-activities.service';
import { UserActivitiesController } from './user-activities.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserActivity.name, schema: UserActivitySchema },
        ]),
    ],
    controllers: [UserActivitiesController],
    providers: [UserActivitiesService],
    exports: [UserActivitiesService],
})
export class UserActivitiesModule {}
