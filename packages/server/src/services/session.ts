import type { UserWithRoles } from '@revelationsai/core/model/user';
import { createVerifier } from 'fast-jwt';
import { getPublicKey, useSession, type SessionValue } from 'sst/node/auth';
import type { RoleService } from './role';
import type { UserService } from './user';
import type { UserGeneratedImageCountService } from './user/image-count';
import type { UserQueryCountService } from './user/query-count';

type ReturnType = Promise<
  | {
      isValid: false;
      sessionToken?: SessionValue;
      userWithRoles?: UserWithRoles;
      maxQueries?: number;
      remainingQueries?: number;
      maxGeneratedImages?: number;
      remainingGeneratedImages?: number;
    }
  | {
      isValid: true;
      sessionToken: SessionValue;
      userWithRoles: UserWithRoles;
      maxQueries: number;
      remainingQueries: number;
      maxGeneratedImages: number;
      remainingGeneratedImages: number;
    }
>;

export class SessionService {
  private readonly userService: UserService;
  private readonly roleService: RoleService;
  private readonly userQueryCountService: UserQueryCountService;
  private readonly userGeneratedImageCountService: UserGeneratedImageCountService;

  constructor(config: {
    userService: UserService;
    roleService: RoleService;
    userQueryCountService: UserQueryCountService;
    userGeneratedImageCountService: UserGeneratedImageCountService;
  }) {
    this.userService = config.userService;
    this.roleService = config.roleService;
    this.userQueryCountService = config.userQueryCountService;
    this.userGeneratedImageCountService = config.userGeneratedImageCountService;
  }

  async getUserAtts(sessionToken: SessionValue): ReturnType {
    if (sessionToken.type !== 'user') {
      return { isValid: false, sessionToken };
    }

    const [user, roles, todaysQueryCount, todaysGeneratedImageCount] = await Promise.all([
      this.userService.getUser(sessionToken.properties.id),
      this.roleService.getRolesByUserId(sessionToken.properties.id),
      this.userQueryCountService.getUserQueryCountByUserIdAndDate(
        sessionToken.properties.id,
        new Date()
      ),
      this.userGeneratedImageCountService.getUserGeneratedImageCountByUserIdAndDate(
        sessionToken.properties.id,
        new Date()
      )
    ]).catch((err) => {
      console.error('Error validating token:', err);
      return [null, null, null, null];
    });
    if (!user || !roles) {
      return { isValid: false, sessionToken };
    }

    const userWithRoles = {
      ...user,
      roles
    };

    let count = 0;
    if (todaysQueryCount) {
      count = todaysQueryCount.count;
    }
    const maxQueries = this.userService.getUserMaxQueries(userWithRoles);

    let imageCount = 0;
    if (todaysGeneratedImageCount) {
      imageCount = todaysGeneratedImageCount.count;
    }
    const maxImages = this.userService.getUserMaxGeneratedImages(userWithRoles);

    console.debug(
      `Returning userWithRoles: ${JSON.stringify(
        userWithRoles
      )}, maxQueries: ${maxQueries}, remainingQueries: ${
        maxQueries - count
      }, maxImages: ${maxImages}, remainingImages: ${maxImages - imageCount}`
    );

    return {
      isValid: true,
      sessionToken,
      userWithRoles: userWithRoles,
      maxQueries,
      remainingQueries: maxQueries - count,
      maxGeneratedImages: maxImages,
      remainingGeneratedImages: maxImages - imageCount
    };
  }

  async validApiHandlerSession(): ReturnType {
    try {
      const sessionToken = useSession();
      return await this.getUserAtts(sessionToken);
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error validating token: ${err.stack}`);
      } else {
        console.error(`Error validating token: ${JSON.stringify(err)}`);
      }
      return { isValid: false };
    }
  }

  /**
   * Validates a non-API handler session token.
   *
   * @param token - The session token to validate.
   * @returns A promise that resolves to the result of the validation.
   */
  async validNonApiHandlerSession(token?: string): ReturnType {
    try {
      if (!token) {
        console.error('No token provided');
        return { isValid: false };
      }

      const jwt = createVerifier({
        algorithms: ['RS512'],
        key: getPublicKey()
      })(token) as SessionValue;

      return await this.getUserAtts(jwt);
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error validating token: ${err.stack}`);
      } else {
        console.error(`Error validating token: ${JSON.stringify(err)}`);
      }
      return { isValid: false };
    }
  }
}
