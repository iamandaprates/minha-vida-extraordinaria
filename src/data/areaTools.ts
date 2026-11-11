import type { AreaId } from '../types';

/**
 * Ferramentas internas de cada área. "list" é uma lista com check (critérios, leituras,
 * viagens); "log" é um registro datado (diário, momentos, encontros).
 */
export interface AreaSection { key: string; label: string; mode: 'list' | 'log'; placeholder: string; bodyLabel?: string; checkLabel?: string; withDate?: boolean; }
export interface AreaTool { tagline: string; sections: AreaSection[]; habitsLabel?: string; }

export const areaTools: Record<AreaId, AreaTool> = {
  profissional: { tagline: 'Carreira CLT & Transição: marcos e entregas.', sections: [
    { key: 'marco', label: 'Marcos da transição', mode: 'list', placeholder: 'Ex.: Reserva de 6 meses pronta', checkLabel: 'alcançado' },
    { key: 'entrega', label: 'Entregas no trabalho', mode: 'log', placeholder: 'O que você entregou', bodyLabel: 'Resultado ou prova' }
  ] },
  financeiro: { tagline: 'Livro-caixa manual e cofres patrimoniais.', sections: [] },
  saude: { tagline: 'Peso, hábitos do corpo e exames preventivos.', sections: [], habitsLabel: 'Hábitos do corpo' },
  'bem-estar': { tagline: 'Rituais estéticos com ciclo de retorno e autocuidado.', sections: [
    { key: 'autocuidado', label: 'Notas de autocuidado', mode: 'list', placeholder: 'Ex.: Protetor solar todo dia', bodyLabel: 'Detalhes' }
  ] },
  intelectual: { tagline: 'Estudos, leituras e oratória.', habitsLabel: 'Rotina de estudo', sections: [
    { key: 'leitura', label: 'Leituras', mode: 'list', placeholder: 'Título do livro', bodyLabel: 'Ideia principal', checkLabel: 'lido' },
    { key: 'oratoria', label: 'Oratória · treinos', mode: 'log', placeholder: 'O que você praticou', bodyLabel: 'O que melhorar na próxima' }
  ] },
  emocional: { tagline: 'Autorregulação, gatilhos e blindagem contra críticas.', sections: [
    { key: 'diario', label: 'Diário de autorregulação', mode: 'log', placeholder: 'Como estou agora, em uma frase', bodyLabel: 'O que fiz para me regular' },
    { key: 'gatilho', label: 'Registro de gatilhos', mode: 'log', placeholder: 'O que me tirou do eixo', bodyLabel: 'Como escolho responder da próxima vez' },
    { key: 'blindagem', label: 'Blindagem contra críticas', mode: 'list', placeholder: 'Uma verdade sobre mim que nenhuma crítica muda' }
  ] },
  espiritual: { tagline: 'Práticas diárias de fé, gratidão e propósito.', habitsLabel: 'Práticas diárias', sections: [
    { key: 'gratidao', label: 'Gratidão', mode: 'log', placeholder: 'Sou grata por...' }
  ] },
  conjugal: { tagline: 'Critérios de escolha, acordos e visão a dois.', sections: [
    { key: 'criterio', label: 'Critérios de escolha', mode: 'list', placeholder: 'Ex.: Fé compartilhada' },
    { key: 'acordo', label: 'Acordos relacionais', mode: 'list', placeholder: 'Ex.: Conversas difíceis no mesmo dia' },
    { key: 'visao', label: 'Visão a dois', mode: 'list', placeholder: 'Como é a vida que vamos construir' }
  ] },
  familia: { tagline: 'Convivência com pais e irmãos e momentos registrados.', sections: [
    { key: 'convivencia', label: 'Convivência', mode: 'list', placeholder: 'Ex.: Almoço de domingo com meus pais', checkLabel: 'feito' },
    { key: 'momento', label: 'Momentos', mode: 'log', placeholder: 'Um momento que vale guardar', bodyLabel: 'Detalhes' }
  ] },
  social: { tagline: 'Encontros, amizades intencionais e eventos.', sections: [
    { key: 'amizade', label: 'Amizades intencionais', mode: 'list', placeholder: 'Nome · como cultivar' },
    { key: 'encontro', label: 'Encontros', mode: 'log', placeholder: 'Com quem e onde' },
    { key: 'evento', label: 'Eventos', mode: 'list', placeholder: 'Evento ou networking', withDate: true, checkLabel: 'fui' }
  ] },
  lazer: { tagline: 'Descanso sem culpa e planejador de viagens.', sections: [
    { key: 'descanso', label: 'Descanso sem culpa', mode: 'log', placeholder: 'Como você descansou' },
    { key: 'viagem', label: 'Planejador de viagens', mode: 'list', placeholder: 'Destino', bodyLabel: 'Roteiro, orçamento e reservas', withDate: true, checkLabel: 'realizada' }
  ] },
  servir: { tagline: 'Projetos sociais, doações e mentoria.', sections: [
    { key: 'projeto', label: 'Projetos sociais', mode: 'list', placeholder: 'Projeto ou causa' },
    { key: 'doacao', label: 'Doações', mode: 'log', placeholder: 'O que e para quem' },
    { key: 'mentoria', label: 'Mentoria', mode: 'log', placeholder: 'Quem você ajudou e como' }
  ] }
};
