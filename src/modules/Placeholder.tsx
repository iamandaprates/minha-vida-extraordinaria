import { useLocation } from 'react-router-dom';
import { guides } from '../layout/nav';
import { EmptyState, Page, PageHeader } from './GuidePage';

const copy: Record<string, { subtitle: string; empty: string }> = {
  '/agenda': { subtitle: 'Hoje, semana e mês em blocos de tempo.', empty: 'Seus blocos de horário, com check e arrastar para o horário certo.' },
  '/areas': { subtitle: 'As 12 dimensões da sua vida, cada uma com sua ferramenta.', empty: 'Grade das 12 áreas, Finanças, Saúde, Bem-estar & Imagem e o Diagnóstico MAAS.' },
  '/projetos': { subtitle: 'Projetos, metas e marcos. Daqui você promove a entrega do dia.', empty: 'Projetos com área da vida, metas com checkpoints e ideias #CAVU ligadas ao Projeto CAVU.' },
  '/estudos': { subtitle: 'Trilhas, flashcards e revisão espaçada.', empty: 'Concurso PRF, Administração e Inglês com flashcards no algoritmo SM-2.' },
  '/ideias': { subtitle: 'A geladeira de potencial: capture rápido, decida depois.', empty: 'Captura em 1 clique, descrição longa, links, imagens e tags.' },
  '/evolucao': { subtitle: 'Relatório Mands S.A.: o que você realmente executou.', empty: 'Taxas de Iniciação, Foco, Retomada e Finalização, mais os diagnósticos do CIS.' }
};

/** Guias que ganham vida nas próximas fases. */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const guide = guides.find(item => item.path === pathname) ?? guides[0];
  const text = copy[pathname] ?? { subtitle: '', empty: '' };
  return <Page>
    <PageHeader eyebrow={guide.label} title={guide.label} subtitle={text.subtitle} />
    <EmptyState icon={guide.icon} title={`Chega na Fase ${guide.phase}`}>{text.empty} A base já está pronta para receber tudo isso.</EmptyState>
  </Page>;
}
