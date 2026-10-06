import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { within } from '@testing-library/dom';
import { boot, cleanupAll, wait } from './helpers';
import { semesterLabel } from '../src/domain/dates';

type Booted = Awaited<ReturnType<typeof boot>>;
const allKeys = () => Object.keys(localStorage).filter(key => key.startsWith('mve:v1:'));
const stored = (collection: string) => JSON.parse(localStorage.getItem(`mve:v1:${collection}:local-user`) ?? '[]');
const label = semesterLabel(new Date());

const side = (b: Booted, name: RegExp) => within(b.screen.getByRole('navigation', { name: 'Navegação principal' })).getByRole('button', { name });
async function goToAreas(b: Booted) {
  b.fireEvent.click(side(b, /Áreas da Vida/));
  await b.screen.findByText('Áreas da minha vida');
}
async function goToCentral(b: Booted) { b.fireEvent.click(side(b, /Central/)); await b.screen.findByText(/Bom dia|Boa tarde|Boa noite/); }
const sliders = (b: Booted) => b.screen.queryAllByRole('slider') as HTMLInputElement[];
function fillAll(b: Booted, value: (index: number) => number) { sliders(b).forEach((slider, index) => b.fireEvent.change(slider, { target: { value: String(value(index)) } })); }
async function openArea(b: Booted, name: string) { b.fireEvent.click(await b.screen.findByRole('heading', { name, level: 3 })); await b.screen.findByText('ÁREA DA VIDA'); }
const indicator = (_b: Booted, text: string) => (within(document.querySelector('.indicator-strip') as HTMLElement).getByText(text).previousElementSibling as HTMLElement).textContent;
async function pickDialog(b: Booted, kindIndex: number) { b.fireEvent.click(b.screen.getAllByRole('button', { name: 'Adicionar ＋' })[kindIndex]); return b.screen.findByRole('dialog'); }

afterEach(() => cleanupAll());
beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });

describe('Avaliação semestral, persistência e histórico', () => {
  it('passos 1 a 12: cria, salva, sai, volta, recarrega, cria segunda, abre a primeira somente leitura', async () => {
    let b = await boot(); await goToAreas(b);
    expect(await b.screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
    expect(b.screen.getAllByText('Sem nota')).toHaveLength(12);
    expect(allKeys()).toHaveLength(0);
    // 1, 2: nova avaliacao, 12 notas
    b.fireEvent.click(b.screen.getByRole('button', { name: /Nova avaliação/ }));
    expect(sliders(b)).toHaveLength(12);
    const save = b.screen.getByRole('button', { name: 'Salvar avaliação' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fillAll(b, i => i + 1 > 10 ? 10 : i + 1); // 1..10,10,10 (12 notas)
    expect(save.disabled).toBe(false);
    b.fireEvent.click(save); // 3
    expect(b.screen.queryByRole('dialog')).toBeNull();
    expect(b.screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(b.screen.getByText('ATUAL')).toBeTruthy();
    expect(stored('life-assessments')).toHaveLength(1);
    // 4, 5, 6: sai da pagina e volta
    await goToCentral(b); await goToAreas(b);
    expect(b.screen.getByText('ATUAL')).toBeTruthy();
    expect(b.screen.getByText('1', { selector: 'b' })).toBeTruthy();
    // 7, 8: recarrega
    b.unmount(); b = await boot(); await goToAreas(b);
    expect(await b.screen.findByText('ATUAL')).toBeTruthy();
    expect(b.screen.queryByText('Nenhuma avaliação registrada')).toBeNull();
    // 9, 10: segunda avaliacao, primeira permanece
    await wait(5);
    b.fireEvent.click(b.screen.getByRole('button', { name: /Nova avaliação/ }));
    fillAll(b, () => 4);
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar avaliação' }));
    const records = stored('life-assessments');
    expect(records).toHaveLength(2);
    expect(Object.values(records[0].scores).slice(0, 3)).toEqual([1, 2, 3]);
    expect(Object.values(records[1].scores).every(v => v === 4)).toBe(true);
    // historico colapsado por padrao
    expect(b.screen.queryByText(/Registrada em/)).toBeNull();
    b.fireEvent.click(b.screen.getByRole('button', { name: /Histórico de avaliações/ }));
    const items = b.screen.getAllByText(/Registrada em/);
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Atual');
    // 11, 12: abre a primeira (mais antiga) em modo somente leitura
    b.fireEvent.click(items[1].closest('button')!);
    const viewer = await b.screen.findByRole('dialog');
    expect(viewer.textContent).toContain('AVALIAÇÃO ANTERIOR');
    expect(viewer.textContent).toContain('Somente leitura');
    expect(b.screen.queryAllByRole('slider')).toHaveLength(0);
    expect(viewer.querySelector('.score-readonly')?.textContent).toContain('Profissional1');
    b.fireEvent.click(within(b.screen.getByRole('dialog')).getAllByRole('button', { name: 'Fechar' })[0]);
    // a avaliacao atual continua a segunda (todas 4); nada foi gravado
    expect(stored('life-assessments')).toEqual(records);
    expect(b.screen.getAllByText('4', { selector: '.area-card-top b' })).toHaveLength(12);
    // reabrir apos reload ainda mostra as duas
    b.unmount(); b = await boot(); await goToAreas(b);
    b.fireEvent.click(await b.screen.findByRole('button', { name: /Histórico de avaliações/ }));
    expect(b.screen.getAllByText(/Registrada em/)).toHaveLength(2);
  });

  it('o botão Histórico não abre mais uma nova avaliação', async () => {
    const b = await boot(); await goToAreas(b);
    b.fireEvent.click(await b.screen.findByRole('button', { name: /Histórico de avaliações/ }));
    expect(b.screen.queryAllByRole('slider')).toHaveLength(0);
    expect(b.screen.getByText('Sem avaliações anteriores.')).toBeTruthy();
  });
});

describe('Dados da área, ações e indicadores', () => {
  it('passos 13 a 20: nota, diagnóstico, objetivo, ação com prazo, conclusão e indicadores', async () => {
    let b = await boot(); await goToAreas(b); await openArea(b, 'Profissional');
    // estado vazio, sem numeros inventados
    for (const name of ['Projetos ativos', 'Ações pendentes', 'Ações atrasadas', 'Execução']) expect(indicator(b, name)).toBe('Sem dados');
    // 13: nota + diagnostico
    b.fireEvent.change(b.screen.getByLabelText('Notas de Profissional'), { target: { value: 'Foco no portfólio' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Precisa de atenção' }));
    // 14, 15: sai e volta
    b.fireEvent.click(b.screen.getByRole('button', { name: /← Áreas da Vida/ })); await goToCentral(b); await goToAreas(b); await openArea(b, 'Profissional');
    expect((b.screen.getByLabelText('Notas de Profissional') as HTMLTextAreaElement).value).toBe('Foco no portfólio');
    expect(b.screen.getByText('● Precisa de atenção')).toBeTruthy();
    // 16: objetivo
    let dialog = await pickDialog(b, 0);
    expect(dialog.textContent).toContain('Adicionar objetivo');
    b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Lançar portfólio' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(indicator(b, 'Objetivos')).toBe('1');
    // 17, 18: acao com prazo vencido, prioridade, objetivo relacionado
    dialog = await pickDialog(b, 3);
    expect(dialog.textContent).toContain('Adicionar ação');
    b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Enviar orçamento' } });
    b.fireEvent.change(b.screen.getByLabelText('Descrição'), { target: { value: 'Para a CAVU' } });
    b.fireEvent.change(b.screen.getByLabelText('Prazo'), { target: { value: '2020-01-15' } });
    b.fireEvent.change(b.screen.getByLabelText('Prioridade'), { target: { value: 'high' } });
    const goalId = stored('goals')[0].id;
    b.fireEvent.change(b.screen.getByLabelText('Objetivo relacionado'), { target: { value: goalId } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(indicator(b, 'Ações pendentes')).toBe('1');
    expect(indicator(b, 'Ações atrasadas')).toBe('1');
    expect(indicator(b, 'Ações concluídas')).toBe('0');
    expect(indicator(b, 'Execução')).toBe('0%');
    expect(indicator(b, 'Movimentação (7 dias)')).toBe('2');
    const row = b.screen.getByText('Enviar orçamento').closest('article')!;
    expect(row.textContent).toContain('Prazo: 15/01/2020');
    expect(row.textContent).toContain('Prioridade alta');
    expect(row.textContent).toContain('Objetivo: Lançar portfólio');
    expect(row.textContent).toContain('Atrasada');
    expect(stored('tasks')[0]).toMatchObject({ areaId: 'professional', goalId, status: 'open', priority: 'high', dueAt: '2020-01-15', description: 'Para a CAVU' });
    // 19, 20: concluir atualiza tudo sozinho
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Concluir Enviar orçamento' }));
    expect(indicator(b, 'Execução')).toBe('100%');
    expect(indicator(b, 'Ações concluídas')).toBe('1');
    expect(indicator(b, 'Ações pendentes')).toBe('0');
    expect(indicator(b, 'Ações atrasadas')).toBe('0');
    expect(b.screen.getByText('Enviar orçamento').closest('article')!.textContent).toContain('Concluída em');
    expect(typeof stored('tasks')[0].completedAt).toBe('string');
    // reabrir limpa completedAt
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Reabrir Enviar orçamento' }));
    expect(indicator(b, 'Execução')).toBe('0%');
    expect(stored('tasks')[0].completedAt).toBeUndefined();
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Concluir Enviar orçamento' }));
    // reload: tudo persiste
    b.unmount(); b = await boot(); await goToAreas(b); await openArea(b, 'Profissional');
    expect((b.screen.getByLabelText('Notas de Profissional') as HTMLTextAreaElement).value).toBe('Foco no portfólio');
    expect(indicator(b, 'Execução')).toBe('100%');
    expect(b.screen.getByText('Lançar portfólio', { selector: 'b' })).toBeTruthy();
    // card da lista usa dados reais
    b.fireEvent.click(b.screen.getByRole('button', { name: /← Áreas da Vida/ }));
    expect(b.screen.getByText('1 objetivo')).toBeTruthy();
    expect(b.screen.getByText('1 ação')).toBeTruthy();
    // outra area nao recebe nada
    await openArea(b, 'Saúde');
    expect(indicator(b, 'Ações pendentes')).toBe('Sem dados');
  });

  it('projeto, ideia, compromisso, edição e exclusão com desvínculo', async () => {
    let b = await boot(); await goToAreas(b); await openArea(b, 'Financeiro');
    // projeto
    await pickDialog(b, 2); b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Reserva de emergência' } }); b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(indicator(b, 'Projetos ativos')).toBe('1');
    // ideia
    const idea = await pickDialog(b, 1); expect(idea.textContent).toContain('Adicionar objetivo futuro');
    b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Investir em fundo' } }); b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(b.screen.getByText('Ideia futura')).toBeTruthy();
    // compromisso
    const ev = await pickDialog(b, 4); expect(ev.textContent).toContain('Adicionar compromisso');
    b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Reunião com contador' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(b.screen.getByRole('alert').textContent).toContain('início');
    b.fireEvent.change(b.screen.getByLabelText('Início'), { target: { value: '2026-11-10T09:30' } });
    b.fireEvent.change(b.screen.getByLabelText('Término (opcional)'), { target: { value: '2026-11-10T09:00' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(b.screen.getByRole('alert').textContent).toContain('depois do início');
    b.fireEvent.change(b.screen.getByLabelText('Término (opcional)'), { target: { value: '2026-11-10T10:30' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(indicator(b, 'Compromissos')).toBe('1');
    expect(stored('events')[0]).toMatchObject({ areaId: 'financial'.replace('financial', 'finance'), source: 'manual', status: 'planned' });
    expect(b.screen.getByText('Reunião com contador').closest('article')!.textContent).toMatch(/10\/11\/2026 às 09:30/);
    // acao ligada ao projeto
    await pickDialog(b, 3); b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Abrir conta' } });
    b.fireEvent.change(b.screen.getByLabelText('Projeto relacionado'), { target: { value: stored('projects')[0].id } }); b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(stored('projects')[0].lastActivityAt).toBeTruthy();
    // editar acao
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Editar Abrir conta' }));
    expect((b.screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Abrir conta');
    expect(b.screen.getByRole('dialog').textContent).toContain('Editar ação');
    b.fireEvent.change(b.screen.getByLabelText('Título'), { target: { value: 'Abrir conta digital' } }); b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar' }));
    expect(stored('tasks')).toHaveLength(1); expect(stored('tasks')[0].title).toBe('Abrir conta digital');
    // excluir projeto: acao permanece, referencia removida
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Editar Reserva de emergência' }));
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Excluir' })); b.fireEvent.click(b.screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(stored('projects')).toHaveLength(0);
    expect(stored('tasks')).toHaveLength(1); expect(stored('tasks')[0].projectId).toBeUndefined();
    b.unmount(); b = await boot(); await goToAreas(b); await openArea(b, 'Financeiro');
    expect(b.screen.getByText('Abrir conta digital')).toBeTruthy(); expect(b.screen.queryByText('Reserva de emergência')).toBeNull();
    expect(document.body.textContent).not.toContain('—');
  });

  it('textos da interface em português, sem o caractere traço longo', async () => {
    const b = await boot(); await goToAreas(b); await openArea(b, 'Saúde');
    const titles: string[] = [];
    for (let i = 0; i < 5; i++) { titles.push((await pickDialog(b, i)).querySelector('h2')!.textContent!); expect(document.body.textContent).not.toContain('—'); b.fireEvent.click(b.screen.getByRole('button', { name: 'Fechar' })); }
    expect(titles).toEqual(['Adicionar objetivo', 'Adicionar objetivo futuro', 'Adicionar projeto', 'Adicionar ação', 'Adicionar compromisso']);
    expect(titles.join(' ')).not.toMatch(/goal|project |action|commitment/i);
  });
});

describe('Regressão: Central, Identidade e navegação mobile', () => {
  it('Central e Identidade continuam funcionando e independentes de Áreas', async () => {
    const b = await boot();
    expect(b.screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Mands/);
    expect(b.screen.getByRole('button', { name: 'Concluir Preparar apresentação do projeto' })).toBeTruthy();
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Concluir Preparar apresentação do projeto' }));
    expect(b.screen.queryByRole('button', { name: 'Concluir Preparar apresentação do projeto' })).toBeNull();
    b.fireEvent.click(side(b, /Identidade/));
    b.fireEvent.click(await b.screen.findByRole('button', { name: 'Editar identidade' }));
    const core = document.querySelector('.editorial-card textarea') as HTMLTextAreaElement;
    b.fireEvent.change(core, { target: { value: 'Novo núcleo.' } });
    b.fireEvent.click(b.screen.getByRole('button', { name: 'Salvar mudanças' }));
    await goToAreas(b); // visita Areas no meio
    await goToCentral(b);
    expect(b.screen.getByText('“Novo núcleo.”')).toBeTruthy();
    expect(b.screen.queryAllByText('Responder proposta da CAVU').length).toBeGreaterThan(0);
    expect(allKeys().filter(k => /tasks|identity/.test(k) && !k.includes('area'))).toEqual([]); // Central/Identidade nao gravam nada
  });

  it('MobileNav tem Áreas e leva ao módulo', async () => {
    const b = await boot();
    const nav = b.screen.getByRole('navigation', { name: 'Navegação móvel' });
    expect(nav.querySelectorAll('button')).toHaveLength(6);
    b.fireEvent.click(Array.from(nav.querySelectorAll('button')).find(btn => btn.textContent === '◌Áreas')!);
    expect(await b.screen.findByText('Áreas da minha vida')).toBeTruthy();
    expect(Array.from(nav.querySelectorAll('button')).find(btn => btn.textContent === '◌Áreas')!.className).toBe('selected');
  });
});
