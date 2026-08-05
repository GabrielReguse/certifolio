import { Logo } from '../components/Logo';
import { useRouter } from '../hooks/useRouter';

const content = {
  privacy: {
    title: 'Política de Privacidade',
    updated: 'Versão inicial — 5 de agosto de 2026',
    sections: [
      ['Quais dados são armazenados', 'O Certifólio armazena os dados de conta, as informações inseridas nos cursos, preferências do perfil e os arquivos enviados pelo próprio usuário.'],
      ['Como os dados são usados', 'Os dados são usados para autenticar sua conta, organizar seu histórico, exibir o perfil público conforme suas escolhas e manter a segurança do serviço.'],
      ['Certificados e privacidade', 'Cursos, certificados e perfil começam privados. Um item somente se torna público após uma ação explícita do usuário. Certificados podem conter dados pessoais; revise o arquivo antes de publicá-lo.'],
      ['Serviços utilizados', 'A aplicação utiliza a infraestrutura da Cloudflare para execução, banco e arquivos. E-mails e login social podem utilizar provedores adicionais quando essas integrações estiverem habilitadas.'],
      ['Seus controles', 'Você pode editar seus dados, tornar o perfil privado, excluir cursos, exportar metadados e excluir integralmente sua conta e os arquivos associados.'],
      ['Contato', 'Antes do lançamento público, substitua este trecho pelo e-mail oficial do responsável pelo projeto.'],
    ],
  },
  terms: {
    title: 'Termos de Uso',
    updated: 'Versão inicial — 5 de agosto de 2026',
    sections: [
      ['Uso da plataforma', 'O Certifólio serve para organizar e apresentar cursos, certificados e experiências de aprendizagem. O usuário é responsável pelas informações e arquivos que cadastrar.'],
      ['Conteúdo e autenticidade', 'Não é permitido publicar certificados falsificados, arquivos de terceiros sem autorização ou conteúdo ilegal. A plataforma não confirma automaticamente a autenticidade de todas as credenciais.'],
      ['Arquivos pessoais', 'Não publique documentos com CPF, endereço, assinatura, QR codes privados ou outros dados sensíveis sem antes ocultá-los.'],
      ['Disponibilidade', 'Esta é uma versão inicial do serviço. Manutenções, alterações técnicas e mudanças nos limites gratuitos dos provedores podem afetar a disponibilidade.'],
      ['Suspensão', 'Contas que abusem do armazenamento, tentem comprometer a segurança ou publiquem conteúdo fraudulento podem ser limitadas ou suspensas.'],
      ['Alterações', 'Os termos podem ser atualizados conforme o produto evoluir. Antes do lançamento público, faça uma revisão jurídica adequada ao público e ao país de operação.'],
    ],
  },
} as const;

export function LegalPage({ kind }: { kind: keyof typeof content }) {
  const { navigate } = useRouter();
  const page = content[kind];
  return <main className="legal-page"><header><Logo/><button className="button button--ghost" onClick={() => navigate('/')}>Voltar</button></header><article><span className="eyebrow">Documentação</span><h1>{page.title}</h1><p>{page.updated}</p>{page.sections.map((section) => <section key={section[0]}><h2>{section[0]}</h2><p>{section[1]}</p></section>)}</article></main>;
}
