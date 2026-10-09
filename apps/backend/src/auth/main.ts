import { bootstrapService } from '../common';

import { AuthModule } from './auth.module';

void bootstrapService({ name: 'auth', module: AuthModule, defaultPort: 4001 });
