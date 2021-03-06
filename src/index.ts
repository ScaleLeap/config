import { isNode } from 'browser-or-node'
import { config } from 'dotenv'
import { from } from 'env-var'
import { render } from 'micromustache'

const NODE_ENV_DEVELOPMENT = 'development'
const NODE_ENV_TEST = 'test'
const NODE_ENV_PRODUCTION = 'production'
const NODE_ENVS = [NODE_ENV_DEVELOPMENT, NODE_ENV_TEST, NODE_ENV_PRODUCTION] as const

export function environmentDefaults(): NodeJS.ProcessEnv {
  // browser environments
  if (!isNode) {
    return {}
  }

  const { error } = config({ path: process.env.DOTENV_CONFIG_PATH })

  // ignore "ENOENT: no such file or directory" error, if `.env` file does not exist
  if (error && !error.message.startsWith('ENOENT')) {
    throw error
  }

  return process.env
}

function expand<T extends NodeJS.ProcessEnv>(variables: T): T {
  // eslint-disable-next-line unicorn/no-array-reduce
  const expanded = Object.keys(variables).reduce((accumulator, key) => {
    let value = variables[key]

    if (value) {
      value = render(value, variables, {
        tags: ['${', '}'],
      })
    }

    return Object.assign(accumulator, { [key]: value })
  }, {} as T)

  const vals = (variables_: T) => Object.values(variables_).sort().join('\n')

  return vals(variables) === vals(expanded) ? expanded : expand(expanded)
}

export class BaseConfig {
  public constructor(private readonly environment = environmentDefaults()) {
    // We can freeze the object only on the next tick, because classes extending
    // this base class need to be able to modify the object during construction.
    // This isn't the best solution, as it will fail to catch prop mutations during the initial
    // loading, but at least it will catch them later during runtime.
    setImmediate(() => Object.freeze(this))
  }

  private readonly from = from(expand(this.environment))

  /**
   * Environment variable prefix that is applied to all of the variables in this class.
   *
   * E.g. setting `prefix` to `FOO_` and then `get('BAR')` will look for variable `FOO_BAR`.
   */
  protected prefix = ''

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  protected get(variableName: string) {
    return this.from.get([this.prefix.toUpperCase(), variableName].join(''))
  }

  /**
   * Determines running environment via `NODE_ENV` variable.
   */
  public readonly NODE_ENV = this.get('NODE_ENV')
    .default(NODE_ENV_DEVELOPMENT)
    .asEnum<typeof NODE_ENVS[number]>([...NODE_ENVS])

  public get isDevelopment(): boolean {
    return this.NODE_ENV === NODE_ENV_DEVELOPMENT
  }

  public get isTest(): boolean {
    return this.NODE_ENV === NODE_ENV_TEST
  }

  public get isProduction(): boolean {
    return this.NODE_ENV === NODE_ENV_PRODUCTION
  }
}
