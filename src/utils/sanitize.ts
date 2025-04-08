/**
 * Sanitizes user input to prevent XSS and other injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove special characters that could be used for injection
  sanitized = sanitized.replace(/[<>{}]/g, '');
  
  // Limit string length
  sanitized = sanitized.slice(0, 100);
  
  return sanitized.trim();
}

/**
 * Sanitizes Discord webhook content
 */
export function sanitizeDiscordContent(content: any): any {
  if (typeof content !== 'object' || !content) return {};

  // Deep clone to avoid modifying original object
  const sanitized = JSON.parse(JSON.stringify(content));

  // Sanitize username and content
  if (sanitized.username) sanitized.username = sanitizeInput(sanitized.username);
  if (sanitized.content) sanitized.content = sanitizeInput(sanitized.content);

  // Sanitize embeds
  if (Array.isArray(sanitized.embeds)) {
    sanitized.embeds = sanitized.embeds.map((embed: any) => {
      if (embed.title) embed.title = sanitizeInput(embed.title);
      if (embed.description) embed.description = sanitizeInput(embed.description);
      
      // Sanitize fields
      if (Array.isArray(embed.fields)) {
        embed.fields = embed.fields.map((field: any) => ({
          name: field.name ? sanitizeInput(field.name) : '',
          value: field.value ? sanitizeInput(field.value) : '',
          inline: !!field.inline
        }));
      }

      return embed;
    });
  }

  return sanitized;
} 