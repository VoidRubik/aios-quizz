import { describe, it, expect } from 'vitest'
import { computeResult } from './calc'
import type { AnswersMap } from './types'

const TRAIT_IDS_BY_TYPE: Record<string, string[]> = {
  agudo: ['a1','a2','a3'],
  solitario: ['s1','s2'],
  sensitivo: [],
  estructurado: [],
  energetico: [],
  expansivo: [],
  carismatico: [],
}

describe('computeResult', () => {
  it('computes raw score as count(si)/total', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.raw.agudo).toBeCloseTo(2/3)
    expect(result.stages.adolescencia.raw.solitario).toBeCloseTo(0)
  })

  it('normalizes scores to sum to 1', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    const sum = Object.values(result.stages.adolescencia.normalized).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('identifies dominant type correctly', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'no', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.dominant).toBe('agudo')
  })

  it('computes carisma index as (1 - ratio1) * 2', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    const { ratio1, carismaIndex } = result.stages.adolescencia
    if (ratio1 !== null && carismaIndex !== null) {
      expect(carismaIndex).toBeCloseTo((1 - ratio1) * 2)
    }
  })

  it('returns null dominants when stage has no answers', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: null, juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: null, juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: null, juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.stages.adolescencia.dominant).toBeNull()
    expect(result.stages.adolescencia.carismaIndex).toBeNull()
  })

  it('canonical equals juventud', () => {
    const answers: AnswersMap = {
      a1: { ninez: null, adolescencia: 'si', juventud: 'si', vejez: null },
      a2: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      a3: { ninez: null, adolescencia: 'no', juventud: 'si', vejez: null },
      s1: { ninez: null, adolescencia: 'si', juventud: 'no', vejez: null },
      s2: { ninez: null, adolescencia: 'si', juventud: 'no', vejez: null },
    }
    const result = computeResult(answers, TRAIT_IDS_BY_TYPE as any)
    expect(result.canonical).toBe(result.stages.juventud)
  })
})
