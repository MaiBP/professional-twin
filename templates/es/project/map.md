# Mapa del proyecto

## Ficha
- **Problema:** _(en una línea)_
- **Para quién:** _(áreas y usuarios)_
- **Solución:** _(qué es y qué hace)_
- **Herramientas:** _(tecnologías, sistemas, terceros)_
- **Impacto:** _(cifras, o "pendiente de medir")_

## Cómo funciona

```map
{
  "direction": "LR",
  "nodes": [
    { "id": "need", "type": "person", "title": "Necesidad", "detail": "Lo que nos contaste" },
    { "id": "twin", "type": "ai", "title": "Descubrimiento", "detail": "Preguntas y análisis" },
    { "id": "solution", "type": "process", "title": "Solución", "detail": "Por definir" }
  ],
  "flows": [
    { "from": "need", "to": "twin" },
    { "from": "twin", "to": "solution" }
  ]
}
```

## Piezas
| Pieza | Qué hace | Dónde está |
|---|---|---|
