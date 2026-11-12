import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

import { demoRequestRouter } from '../../../main/interfaces/http/fastify/routes/demoRequest'
import type { IocContainer } from '../../../main/types/application/ioc'
import type { Mail } from '../../../main/types/infra/mail/mailer.interface'

const build = async () => {
  const sent: Mail[] = []
  const fastify = Fastify()
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)
  fastify.iocContainer = {
    mailer: { send: (_kind: string, mail: Mail) => sent.push(mail) },
    config: { demoRequestTo: 'contact@etepea.fr' },
  } as unknown as IocContainer
  await fastify.register(demoRequestRouter)
  return { fastify, sent }
}

const demo = {
  firstName: 'Ada',
  lastName: '<b>Lovelace</b>',
  email: 'ada@clinique.fr',
  establishment: 'Clinique des Lilas',
  role: 'Coordinatrice',
}

describe('demande de démo du site vitrine', () => {
  it('envoie un e-mail échappé à l adresse configurée', async () => {
    const { fastify, sent } = await build()
    const res = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: demo,
    })
    expect(res.statusCode).toBe(204)
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('contact@etepea.fr')
    expect(sent[0].text).toContain('ada@clinique.fr')
    expect(sent[0].html).toContain('&lt;b&gt;Lovelace')
  })

  it('ignore en silence une demande dont le champ piège est rempli', async () => {
    const { fastify, sent } = await build()
    const res = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { ...demo, website: 'http://spam.example' },
    })
    expect(res.statusCode).toBe(204)
    expect(sent).toHaveLength(0)
  })

  it('refuse une adresse invalide', async () => {
    const { fastify, sent } = await build()
    const res = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { ...demo, email: 'pas-une-adresse' },
    })
    expect(res.statusCode).toBe(400)
    expect(sent).toHaveLength(0)
  })
})
