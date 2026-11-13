import { describe, expect, it } from 'vitest'
import { APP_NAME, DISCLAIMER_TEXT } from './config'

describe('config', () => {
  it('define un nombre de app no vacío', () => {
    expect(APP_NAME.trim().length).toBeGreaterThan(0)
  })

  it('el aviso aclara que no es oficial', () => {
    expect(DISCLAIMER_TEXT.toLowerCase()).toContain('no pertenece')
  })
})
