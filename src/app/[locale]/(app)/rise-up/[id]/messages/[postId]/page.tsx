import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import type { RisePostView } from "@/lib/domain-types";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { getThread } from "@/server/rise";
import { Composer } from "../../ProjectView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise.thread");
  return { title: t("metaTitle") };
}

function Post({ post, main, format, now }: { post: RisePostView; main?: boolean; format: Awaited<ReturnType<typeof getFormatter>>; now: Date }) {
  return (
    <article className={main ? "grid gap-2 rounded-lg border-2 border-line-strong bg-raised p-4 shadow-pop" : "grid gap-1.5 border-l-2 border-line-strong pl-3.5"}>
      <div className="flex items-center gap-2.5">
        <Avatar initials={initials(post.author?.name ?? "?")} size="sm" />
        <b className="text-sm">{post.author?.name ?? "—"}</b>
        <span className="text-[13px] text-muted">{format.relativeTime(new Date(post.createdAt), now)}</span>
      </div>
      <p className="text-[15px] leading-[22px] whitespace-pre-line">{post.body}</p>
    </article>
  );
}

/** A post of the project's feed and its replies. */
async function ThreadData({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params;
  const user = await pageUser(`/rise-up/${id}/messages/${postId}`);
  const thread = await orNotFound(getThread(user.id, id, postId));
  if (!thread) notFound();
  const [t, format] = await Promise.all([getTranslations("rise"), getFormatter()]);
  const now = new Date();
  return (
    <>
      <TopBar back={`/rise-up/${id}`} backLabel={t("thread.back")} title={t("thread.header")} />
      <Page narrow>
        <Post post={thread.post} main format={format} now={now} />
        <div className="grid gap-4">
          {thread.replies.map((r) => (
            <Post key={r.id} post={r} format={format} now={now} />
          ))}
          {thread.replies.length === 0 && <p className="text-sm text-muted">{t("thread.noReplies")}</p>}
        </div>
        {thread.canReply ? <Composer projectId={id} parentId={postId} label={t("thread.replyLabel")} placeholder={t("thread.replyPlaceholder")} /> : <p className="text-sm text-muted">{t("project.joinToWrite")}</p>}
      </Page>
    </>
  );
}

export default function ThreadPage({ params }: PageProps<"/[locale]/rise-up/[id]/messages/[postId]">) {
  return (
    <Suspense>
      <ThreadData params={params} />
    </Suspense>
  );
}
