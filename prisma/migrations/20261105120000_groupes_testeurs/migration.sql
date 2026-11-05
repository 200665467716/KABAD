-- Groupe de testeurs pour chaque application qui n'en a pas : celles publiées avant la refonte.
-- Comme à la publication, le groupe est ouvert au nom de l'auteur, avec le lien d'installation ;
-- les testeurs déjà inscrits y entrent. Aucune table ne change.
DO $$
DECLARE
  app RECORD;
  cid TEXT;
BEGIN
  FOR app IN
    SELECT t.id, t."ownerId", t.name, t.url, split_part(u.name, ' ', 1) AS first_name
    FROM "TestApp" t JOIN "User" u ON u.id = t."ownerId"
    WHERE t."conversationId" IS NULL
  LOOP
    cid := 'tg' || md5(random()::text || app.id);
    INSERT INTO "Conversation" (id, kind, name, theme, "createdById", "createdAt", "lastMessageAt")
    VALUES (cid, 'GROUP', left('Testeurs ' || app.name, 60), 'Test', app."ownerId", now(), now());
    INSERT INTO "ConversationMember" ("conversationId", "userId", role, "joinedAt", "lastReadAt")
    VALUES (cid, app."ownerId", 'OWNER', now(), now());
    INSERT INTO "ConversationMember" ("conversationId", "userId", role, "joinedAt", "lastReadAt")
    SELECT cid, p."userId", 'MEMBER', p."joinedAt", now() FROM "TestParticipant" p
    WHERE p."testAppId" = app.id AND p."userId" <> app."ownerId";
    INSERT INTO "Message" (id, "conversationId", kind, body, "createdAt")
    VALUES ('tm' || md5(random()::text || cid), cid, 'SYSTEM', left(app.first_name || ' a ouvert le groupe de test. Installer l’app : ' || app.url, 4000), now());
    UPDATE "TestApp" SET "conversationId" = cid WHERE id = app.id;
  END LOOP;
END $$;
