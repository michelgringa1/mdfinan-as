import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://uapbbjgvgivfvppzkqpo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGJiamd2Z2l2ZnZwcHprcXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMjI0NTksImV4cCI6MjA5OTg5ODQ1OX0.2S9acj-WXZOWumNDBPbh8sOE0niaFQJ6nl1TrqZITk4'
)

const WORKSPACE = 'dricka'

// Substitui o window.storage do artefato por uma versão que salva no Supabase.
export function installStorage() {
  window.storage = {
    async get(key) {
      const { data, error } = await supabase
        .from('app_storage').select('value')
        .eq('workspace', WORKSPACE).eq('key', key).maybeSingle()
      if (error) throw error
      if (!data) return null
      return { value: JSON.stringify(data.value) }
    },
    async set(key, value) {
      const obj = typeof value === 'string' ? JSON.parse(value) : value
      const { error } = await supabase
        .from('app_storage')
        .upsert({ workspace: WORKSPACE, key, value: obj, updated_at: new Date().toISOString() }, { onConflict: 'workspace,key' })
      if (error) throw error
      return { value }
    },
    async list() { return { keys: [] } },
    async delete(key) {
      await supabase.from('app_storage').delete().eq('workspace', WORKSPACE).eq('key', key)
      return { key, deleted: true }
    },
  }
}
