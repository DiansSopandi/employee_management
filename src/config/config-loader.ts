import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';

export function yamlConfigLoader() {
  const configPath = path.join(process.cwd(), 'dist', 'config', 'config.yaml');
  const configFile = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configFile);

  // Replace placeholders with environment variables
  function replaceEnvVars(obj: any) {
    if (typeof obj === 'string') {
      return obj.replace(/\${(\w+)}/g, (_, name) => process.env[name] || '');
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        obj[key] = replaceEnvVars(obj[key]);
      }
    }
    return obj;
  }

  return replaceEnvVars(config);
}
