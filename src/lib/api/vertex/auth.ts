import { execSync } from 'child_process';
import { GoogleAuth } from 'google-auth-library';

export interface AuthProvider {
  /** Return a Bearer token, or throw if not configured. */
  getToken(): Promise<string>;
}

export class NotConfiguredAuthProvider implements AuthProvider {
  async getToken(): Promise<string> {
    throw new Error(
      'Chat auth not configured. Implement AuthProvider in src/lib/api/vertex/auth.ts ' +
      '(e.g. gcloud-auth, ADC, or user-OAuth).',
    );
  }
}

let provider: AuthProvider = new NotConfiguredAuthProvider();

export function setAuthProvider(p: AuthProvider): void { provider = p; }
export function getAuthToken(): Promise<string> { return provider.getToken(); }

export class GcloudCliAuthProvider implements AuthProvider {
  async getToken(): Promise<string> {
    try {
      return execSync('gcloud auth print-access-token', {
        encoding: 'utf-8',
        timeout: 10_000,
      }).trim();
    } catch (cause) {
      throw new Error(
        'Failed to mint gcloud access token. Run `gcloud auth login` first.',
        { cause },
      );
    }
  }
}

/**
 * Production auth provider for Cloud Run.
 *
 * Resolves credentials via Google Application Default Credentials (ADC). On
 * Cloud Run, ADC automatically reads from the instance metadata server, so no
 * service account key is required. The service account attached to the Cloud
 * Run instance must have `roles/aiplatform.user` to call Vertex AI Agent Engine.
 */
export class CloudRunAuthProvider implements AuthProvider {
  private auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  async getToken(): Promise<string> {
    try {
      const client = await this.auth.getClient();
      const token = await client.getAccessToken();
      if (!token.token) {
        throw new Error('Failed to obtain access token from Cloud Run metadata server');
      }
      return token.token;
    } catch (cause) {
      throw new Error(
        'Failed to obtain access token via Application Default Credentials. ' +
        'Ensure this is running on Cloud Run with a service account that has ' +
        'roles/aiplatform.user, or set GOOGLE_APPLICATION_CREDENTIALS locally.',
        { cause },
      );
    }
  }
}

if (process.env.NODE_ENV === 'production') {
  setAuthProvider(new CloudRunAuthProvider());
} else {
  // In dev, auto-wire the gcloud CLI auth provider so the chat works out of the box.
  setAuthProvider(new GcloudCliAuthProvider());
}
