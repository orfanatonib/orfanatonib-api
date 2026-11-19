import {
  renderFeedCommentApproved,
  renderFeedCommentPending,
  renderFeedCommentRejected,
} from "./feed-comment.templates";

const context = { appUrl: "https://www.orfanatonib.com" };

describe("templates de moderação de comentário do feed", () => {
  it("pendente: vai à coordenação com link do painel e sem texto do comentário", () => {
    const out = renderFeedCommentPending(
      { authorName: "Maria S.", postCaption: "Visita" },
      context,
    );
    expect(out.html).toContain(
      "https://www.orfanatonib.com/adm/comentarios-feed",
    );
    expect(out.text).toContain("Maria S.");
    expect(out.html).not.toMatch(/Olá/);
  });

  it("aprovado: saúda o autor e leva ao feed", () => {
    const out = renderFeedCommentApproved(
      { userName: "Maria", commentExcerpt: "Lindo!", postCaption: "Visita" },
      context,
    );
    expect(out.html).toContain("Olá <strong>Maria</strong>");
    expect(out.html).toContain(
      "https://www.orfanatonib.com/feed-ministerio-orfanatos-nib",
    );
    expect(out.text).toContain("aprovado");
  });

  it("reprovado: mostra o motivo e escapa HTML vindo do usuário", () => {
    const out = renderFeedCommentRejected(
      {
        userName: "Maria",
        commentExcerpt: "<b>oi</b>",
        postCaption: "<script>x</script>",
        reason: "<i>fora</i> do tema",
      },
      context,
    );
    expect(out.html).toContain("Motivo:");
    expect(out.html).not.toContain("<script>");
    expect(out.html).not.toContain("<i>fora</i>");
    expect(out.text).toContain("Motivo: <i>fora</i> do tema");
  });
});
