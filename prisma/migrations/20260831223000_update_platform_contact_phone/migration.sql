-- Atualiza contato WhatsApp da plataforma e da org demo (ze-do-corte).
UPDATE "Organization"
SET
  "phoneLabel" = '(12) 98700-2929',
  "whatsappHref" = 'https://wa.me/5512987002929',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'ze-do-corte'
   OR "phoneLabel" IN ('(12) 99637-3335', '12996373335', '12987002929')
   OR "whatsappHref" LIKE '%5512996373335%';
