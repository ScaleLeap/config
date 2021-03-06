// eslint-disable-next-line max-classes-per-file
import path from 'path'

// eslint-disable-next-line import/extensions
import { BaseConfig, environmentDefaults } from '.'

const DOTENV_CONFIG_PATH = path.join(__dirname, '../tests/.env')

class Config extends BaseConfig {
  public readonly PORT = this.get('PORT').asIntPositive()
}

describe(`${environmentDefaults.name}`, () => {
  beforeEach(() => {
    process.env.DOTENV_CONFIG_PATH = DOTENV_CONFIG_PATH
    process.env.FOO = 'bar'
  })

  afterEach(() => {
    delete process.env.FOO
    delete process.env.DOTENV_CONFIG_PATH
  })

  it('should retain original process.env values', () => {
    expect.hasAssertions()

    const variables = environmentDefaults()

    expect(variables.FOO).toBe('bar')
  })
})

describe(`${BaseConfig.name}`, () => {
  beforeEach(() => {
    process.env.PORT = '3000'
  })

  afterEach(() => {
    delete process.env.PORT
  })

  it('should instantiate with defaults', () => {
    expect.hasAssertions()
    expect(new BaseConfig()).toBeInstanceOf(BaseConfig)
  })

  it('should be extendable', () => {
    expect.hasAssertions()

    const myConfig = new Config()

    expect(myConfig).toHaveProperty('PORT')
    expect(myConfig.PORT).toBe(3000)
  })

  it('should allow process.env override via constructor', () => {
    expect.hasAssertions()

    const myConfig = new Config({ PORT: '1000' })

    expect(myConfig.PORT).toBe(1000)
  })

  it('should be frozen on the next interval', async () => {
    expect.assertions(1)

    const promise = new Promise<void>((done) => {
      const myConfig = new Config()

      const mutate = (): Config => Object.assign(myConfig, { PORT: 1 })

      setTimeout(() => {
        expect(mutate).toThrow(/Cannot assign to read only property/)

        done()
      }, 50)
    })

    await promise
  })

  it('should have NODE_ENV set', () => {
    expect.hasAssertions()

    const myConfig = new Config()

    expect(myConfig.NODE_ENV).toBe('test')
  })

  it('should have NODE_ENV getters', () => {
    expect.hasAssertions()

    const myConfig = new Config()

    expect(myConfig.isDevelopment).not.toBeUndefined()
    expect(myConfig.isTest).not.toBeUndefined()
    expect(myConfig.isProduction).not.toBeUndefined()

    expect(myConfig.isDevelopment).toBe(false)
    expect(myConfig.isTest).toBe(true)
    expect(myConfig.isProduction).toBe(false)
  })
})

describe(`${BaseConfig.name}`, () => {
  it('should read defaults from .env file', () => {
    expect.hasAssertions()

    process.env.DOTENV_CONFIG_PATH = DOTENV_CONFIG_PATH

    const myConfig = new Config()

    expect(myConfig.PORT).toBe(2000)

    delete process.env.DOTENV_CONFIG_PATH
  })
})

describe(`${BaseConfig.name}`, () => {
  class PrefixedConfig extends BaseConfig {
    protected readonly prefix = 'FOO_'

    public readonly BAR = this.get('BAR').asString()
  }

  it('should support custom prefixes', () => {
    expect.hasAssertions()

    const myConfig = new PrefixedConfig({ FOO_BAR: 'baz' })

    expect(myConfig.BAR).toBe('baz')
  })

  it('and NODE_ENV still works without prefix', () => {
    expect.hasAssertions()

    const myConfig = new PrefixedConfig()

    expect(myConfig.NODE_ENV).toBe('test')
  })
})

describe(`${BaseConfig.name}`, () => {
  let environment: NodeJS.ProcessEnv

  beforeEach(() => {
    environment = { ...process.env }
  })

  afterEach(() => {
    process.env = { ...environment }
  })

  /* eslint-disable no-template-curly-in-string */
  const BAR = '${FOO} suffix'
  const BAZ = '${BAR}'
  /* eslint-enable no-template-curly-in-string */

  class ExpandConfig extends BaseConfig {
    public readonly BAR = this.get('BAR').asString()

    public readonly BAZ = this.get('BAZ').asString()
  }

  it('should interpolate from constructor variables', () => {
    expect.assertions(1)

    const config = new ExpandConfig({
      FOO: '123',
      BAR,
    })

    expect(config.BAR).toBe('123 suffix')
  })

  it('should interpolate recursively', () => {
    expect.assertions(1)

    const config = new ExpandConfig({
      FOO: '123',
      BAZ,
      BAR,
    })

    expect(config.BAZ).toBe('123 suffix')
  })

  it('should interpolate from environment', () => {
    expect.assertions(1)

    process.env.FOO = '456'
    process.env.BAR = BAR

    const config = new ExpandConfig()

    expect(config.BAR).toBe('456 suffix')
  })

  it('should interpolate from .env file', () => {
    expect.assertions(1)

    process.env.DOTENV_CONFIG_PATH = DOTENV_CONFIG_PATH

    const config = new ExpandConfig()

    expect(config.BAR).toBe('789 suffix')
  })
})
