import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { PrismaService } from "./prisma.service.js";
import { PrismaModule } from "./prisma.module.js";
import { buildAdminOptions } from "./admin/admin-options.js";
import { authenticateStaff } from "./admin/authenticate.js";

const PgSession = connectPgSimple(session);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    import("@adminjs/nestjs").then(({ AdminModule }) =>
      AdminModule.createAdminAsync({
        imports: [ConfigModule, PrismaModule],
        inject: [ConfigService, PrismaService],
        useFactory: async (
          config: ConfigService,
          prisma: PrismaService
        ) => {
          const rootPath = config.get<string>("ADMIN_ROOT_PATH", "/admin");
          const cookieSecret = config.getOrThrow<string>("ADMIN_COOKIE_SECRET");
          const sessionSecret = config.getOrThrow<string>("ADMIN_SESSION_SECRET");
          const databaseUrl = config.getOrThrow<string>("DATABASE_URL");

          return {
            adminJsOptions: await buildAdminOptions(prisma, rootPath),
            auth: {
              authenticate: (email: string, password: string) =>
                authenticateStaff(prisma, email, password),
              cookieName: "naucto-admin",
              cookiePassword: cookieSecret
            },
            sessionOptions: {
              store: new PgSession({
                conString: databaseUrl,
                tableName: "admin_session",
                createTableIfMissing: true
              }),
              secret: sessionSecret,
              resave: false,
              saveUninitialized: false,
              cookie: {
                httpOnly: true,
                sameSite: "lax",
                secure: config.get<string>("NODE_ENV") === "production"
              }
            }
          };
        }
      })
    )
  ],
  providers: [],
  exports: []
})
export class AppModule {}
