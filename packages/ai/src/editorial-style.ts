/** Editorial checks, not an AI detector or a substitute for human review. */
export const EDITORIAL_STYLE_VERSION = "atv-editorial-style/1.0.0";
export const editorialStyleRules = [
  "Escreva como alguém que explica astrologia a uma pessoa: palavras familiares, assunto concreto e verbos diretos. Use mapa astral, previsões, amor, carreira e dinheiro quando forem o assunto da leitura.",
  "Comece cada seção pelo que ela acrescenta. Explique o fator e sua relação com a pergunta antes de sugerir uma aplicação. Uma frase que caberia em qualquer leitura precisa ser reescrita.",
  "Evite atlas editorial, cartografia celeste, bússola interior, jornadas de transformação e perguntas vagas sobre direção. Preserve o nome oficial do produto, como Bússola de Carreira.",
  "Não feche parágrafos com slogans como sem transformar tendência em sentença, com contexto e espaço para escolha ou sem receitas prontas. Informe cada limite concreto uma vez na seção apropriada.",
  "Não repita na introdução, síntese e conclusão o mesmo aviso. Diga exatamente o que falta e o que isso altera na leitura. Não apague incertezas reais nem invente garantias.",
  "Evite contrastes ornamentais do tipo não é X, é Y, enumerações de qualidades abstratas e conclusões que só repetem o título. Varie a construção quando o raciocínio pedir.",
  "Use previsões para uma análise astrológica de período. Atração, sensualidade e dinheiro podem ser tratados quando há fatores pertinentes, sem inferir a intimidade de terceiros nem prometer resultados.",
  "Naturalidade vem de raciocínio específico e revisão. Não insira erros, depoimentos inventados, experiências pessoais falsas nem alegue autoria humana ou desempenho em detectores.",
] as const;

export interface StyleFinding {
  code: string;
  location: string;
}
export interface EditorialPassage {
  text: string;
  location: string;
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const decorative =
  /\b(?:cartografia celeste|atlas editorial|bussola interior|calculo quando ha calculo|que direcao pede um olhar mais atento)\b/;
const padding =
  /\b(?:sem transformar tendencia em sentenca|com contexto, metodo e espaco para escolha|com consentimento e sem receitas prontas|sem receitas prontas)\b/;

/** Pass only authored interpretation, never quoted user reports or immutable calculated facts. */
export function inspectEditorialStyle(
  passages: readonly EditorialPassage[],
): StyleFinding[] {
  const findings: StyleFinding[] = [];
  const formulaLocations: string[] = [];
  for (const passage of passages) {
    const text = normalize(passage.text);
    if (decorative.test(text))
      findings.push({
        code: "decorative_language",
        location: passage.location,
      });
    if (padding.test(text))
      findings.push({ code: "editorial_padding", location: passage.location });
    if (
      /\b(?:nao determina (?:seu|o) destino|nao e (?:uma )?promessa|nao substitui orientacao profissional)\b/.test(
        text,
      )
    )
      formulaLocations.push(passage.location);
  }
  if (formulaLocations.length > 1)
    for (const location of formulaLocations.slice(1))
      findings.push({ code: "repeated_disclaimer", location });
  return findings;
}
