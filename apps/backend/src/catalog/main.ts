import { bootstrapService } from '../common';

import { CatalogModule } from './catalog.module';

void bootstrapService({ name: 'catalog', module: CatalogModule, defaultPort: 4002 });
