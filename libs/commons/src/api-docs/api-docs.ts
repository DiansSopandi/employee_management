import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export class ApiDocs {
  static setup(app: INestApplication, configService: ConfigService) {
    const appName = configService.get('APP_NAME'),
      appDescription = configService.get('APP_DESCRIPTION'),
      appVersion = configService.get('APP_VERSION'),
      apiDocs = configService.get('APP_APIDOCS');

    const config = new DocumentBuilder()
      .setTitle(appName)
      .setDescription(appDescription)
      .setVersion(appVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const options = {
      customSiteTitle: `${configService
        .get('APP_NAME')
        .toUpperCase()} endpoints`,
      swaggerOptions: {
        docExpansion: 'none',
        tagsSorter: 'alpha',
      },
    };
    SwaggerModule.setup(apiDocs, app, document, options);
  }
}
