# Guía de Pruebas - Fuzzy Matching del Asistente

Este documento describe los casos de prueba para validar el fuzzy matching implementado en el asistente de PPTO.

## Casos de Prueba Obligatorios

### ✅ Caso 1: Input Exacto
**Objetivo:** Verificar que los nombres exactos sigan funcionando igual o mejor que antes

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para la línea SEGURIDAD en 2025?"
Usuario: "Dame el presupuesto de Servicio Gestion de infraestructura en 2025"
```

**Resultado esperado:**
- Match directo (matchType: "exact")
- Respuesta inmediata sin ambigüedad
- El asistente NO debe mencionar que está buscando o asumiendo nada

**Validación:**
- ✓ La respuesta incluye el total anual correcto
- ✓ Los detalles mensuales son correctos
- ✓ No hay mensajes de clarificación innecesarios

---

### ✅ Caso 2: Input Simplificado (Case-Insensitive)
**Objetivo:** Verificar que las variaciones de mayúsculas/minúsculas funcionen

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para seguridad en 2025?"
Usuario: "presupuesto de INFRAESTRUCTURA en 2024"
Usuario: "chatbots soporte 2025"
```

**Resultado esperado:**
- Match exitoso por normalización (matchType: "exact" después de normalizar)
- Respuesta correcta sin pedir clarificación
- El asistente puede mencionar el nombre oficial si difiere ligeramente

**Validación:**
- ✓ Encuentra la línea correcta aunque el case sea diferente
- ✓ La respuesta es clara y directa
- ✓ Los datos son correctos

---

### ✅ Caso 3: Input Abreviado (StartsWith)
**Objetivo:** Verificar que abreviaciones comunes funcionen

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para infra en 2024?"
Usuario: "Dame el total de serv en 2025"
Usuario: "agil 2025"
```

**Resultado esperado:**
- Match por inicio (matchType: "startsWith")
- Si la abreviación es única, hace match directo
- Si hay ambigüedad (ej: "serv" matchea "Servicio A" y "Servicio B"), debe pedir clarificación
- El asistente menciona el nombre completo de la línea encontrada

**Validación:**
- ✓ Abreviaciones claras funcionan sin ambigüedad
- ✓ Cuando hay ambigüedad, el asistente pide más información
- ✓ La respuesta menciona: "Encontré la línea 'X' en base a tu búsqueda..."

---

### ✅ Caso 4: Input con Typos Menores (Fuzzy)
**Objetivo:** Verificar que errores de tipeo pequeños se corrijan

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para seguidad en 2025?" (typo: seguidad → seguridad)
Usuario: "infraestruktura 2024" (typo: k → c)
Usuario: "agilidad servicios esternos" (typo: esternos → externos)
```

**Resultado esperado:**
- Match por Levenshtein (matchType: "fuzzy")
- Solo si la distancia es pequeña (≤ 40% de la longitud del input)
- El asistente DEBE mencionar claramente qué línea encontró
- Mensaje tipo: "Encontré la línea 'Seguridad' (puede que hayas querido escribir esto)..."

**Validación:**
- ✓ Typos menores (1-2 caracteres) se corrigen
- ✓ El asistente es transparente sobre qué encontró
- ✓ La respuesta es útil pero aclara la interpretación

---

### ✅ Caso 5: Input Parcial (Contains)
**Objetivo:** Verificar que búsquedas por palabras clave funcionen

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para gestión en 2025?" (puede haber "Servicio Gestión X", "Gestión Y", etc.)
Usuario: "soporte 2024"
Usuario: "servicios externos"
```

**Resultado esperado:**
- Match por contains (matchType: "partial")
- Si hay una sola coincidencia, la usa
- Si hay múltiples coincidencias con scores similares, pide clarificación
- El asistente menciona la línea exacta que encontró

**Validación:**
- ✓ Palabras clave únicas funcionan
- ✓ Palabras clave ambiguas piden clarificación
- ✓ La respuesta es clara sobre qué línea se usó

---

### ❌ Caso 6: Input Imposible / No Encontrado
**Objetivo:** Verificar que el sistema NO invente datos

**Consultas de ejemplo:**
```
Usuario: "¿Cuánto presupuesto hay para línea INVENTADA XYZ en 2025?"
Usuario: "presupuesto de NOEXISTE 2024"
Usuario: "asdfghjkl"
```

**Resultado esperado:**
- No se encuentra match (matchResult: null)
- El asistente responde que NO encontró ninguna línea similar
- Ofrece ayuda: sugiere que el usuario verifique el nombre
- Opcionalmente, menciona algunas líneas disponibles como referencia
- NO inventa datos, NO hace queries a la BD

**Validación:**
- ✓ Responde claramente que no encontró coincidencias
- ✓ No inventa datos ni montos
- ✓ Ofrece orientación útil (ej: "Algunas líneas disponibles son...")
- ✓ El tono es amigable, no frustrante

---

### ⚠️ Caso 7: Input Ambiguo
**Objetivo:** Verificar que ambigüedades se detecten

**Consultas de ejemplo:**
```
Usuario: "apps 2025" (si hay "Aplicaciones Web" y "Apps Móviles" con scores similares)
Usuario: "servicio" (palabra demasiado genérica)
Usuario: "externa" (puede ser "Servicios Externos", "Consultoría Externa", etc.)
```

**Resultado esperado:**
- El fuzzy matching detecta múltiples candidatos con scores similares (diferencia < 5)
- Retorna `null` para forzar clarificación
- El asistente pide al usuario que sea más específico
- Opcionalmente, menciona las opciones que encontró

**Validación:**
- ✓ No elige arbitrariamente cuando hay ambigüedad
- ✓ Pide clarificación de forma amable
- ✓ Sugiere cómo ser más específico

---

## Casos de Prueba Adicionales (Opcionales)

### Caso 8: Input con Tildes vs Sin Tildes
```
Usuario: "gestion" → debe encontrar "Gestión"
Usuario: "infraestructura" → debe encontrar "Infraestructura"
```

### Caso 9: Input con Caracteres Especiales
```
Usuario: "apps - móviles" → debe encontrar "Apps Móviles"
Usuario: "servicio/gestión" → debe encontrar "Servicio Gestión"
```

### Caso 10: Input Muy Corto (Edge Case)
```
Usuario: "app" (solo 3 caracteres)
Usuario: "ti" (solo 2 caracteres)
```
- Si es muy corto y hay muchas coincidencias, debe pedir más contexto
- El fuzzy matching solo aplica si input.length >= 3

---

## Cómo Probar

### 1. Verificación Manual en el Frontend

1. Inicia el backend y frontend:
   ```bash
   pnpm dev
   ```

2. Accede a: http://localhost:5173/assistant

3. Prueba cada caso de uso listado arriba

4. Verifica que:
   - Las respuestas son correctas
   - Los montos coinciden con lo esperado
   - El asistente es transparente cuando hace fuzzy matching
   - No se inventan datos cuando no hay match

### 2. Verificación de Logs (Desarrollo)

En modo desarrollo, el backend loguea los matches:
```
[Assistant] Fuzzy match: "infra" → "Servicio Gestión de Infraestructura" (type: startsWith, score: 87)
```

Revisa los logs para entender qué tipo de match se está usando.

### 3. Verificación de Casos Extremos

- Prueba con líneas reales de tu BD (lista de supports)
- Prueba con inputs muy largos, muy cortos, vacíos
- Prueba con caracteres especiales, emojis, etc.

---

## Checklist de Validación Final

Antes de considerar la funcionalidad completa, verifica:

- [ ] **Caso 1 (Exacto):** Funciona igual que antes ✅
- [ ] **Caso 2 (Simplificado):** Case-insensitive funciona ✅
- [ ] **Caso 3 (Abreviado):** Abreviaciones claras funcionan ✅
- [ ] **Caso 4 (Typos):** Typos menores se corrigen con transparencia ✅
- [ ] **Caso 5 (Parcial):** Palabras clave funcionan ✅
- [ ] **Caso 6 (Imposible):** No inventa datos ✅
- [ ] **Caso 7 (Ambiguo):** Detecta ambigüedades y pide clarificación ✅

- [ ] **No se rompió nada:** Funcionalidades previas siguen operando
- [ ] **Performance:** No hay lentitud notable (el fuzzy matching es local)
- [ ] **Logs limpios:** No hay errores en consola ni warnings innecesarios

---

## Troubleshooting

### "No encuentra una línea que debería existir"
- Verifica que la línea esté activa en BD (`active: true`)
- Revisa los logs para ver qué score obtuvo
- Ajusta los umbrales si es necesario (actualmente: distancia ≤ 40% del input)

### "Encuentra la línea incorrecta"
- Puede haber ambigüedad
- El usuario debe ser más específico
- Considera agregar alias manuales en el futuro

### "Es muy lento"
- El fuzzy matching es local (no usa Gemini)
- Si hay miles de líneas, considera cachear la lista de supports
- Actualmente hace una query a prisma.support.findMany() por cada consulta

### "El asistente no menciona que hizo fuzzy matching"
- Verifica que `matchInfo.wasExactMatch` esté llegando correctamente a Gemini
- Revisa el prompt del sistema (debe tener la regla de mencionar matches no exactos)

---

## Próximas Mejoras Sugeridas

1. **Alias manuales:** Permitir definir alias en BD (ej: "infra" → "Infraestructura")
2. **Caché:** Cachear la lista de supports para no consultar en cada request
3. **Sugerencias inteligentes:** Cuando no hay match, usar Gemini para sugerir líneas similares
4. **Feedback del usuario:** Permitir que el usuario corrija el match y aprender de eso
5. **Búsqueda por múltiples campos:** Considerar otros campos como `management`, `area`, etc.

---

## Documentación del Código

Las funciones clave están en:
- **`normalizeText()`** - Normalización de strings
- **`levenshteinDistance()`** - Cálculo de distancia fuzzy
- **`findBestSupportMatch()`** - Lógica completa de matching
- **`queryBudgetData()`** - Integración con el flujo del asistente

Todas están documentadas con JSDoc y comentarios explicativos.
