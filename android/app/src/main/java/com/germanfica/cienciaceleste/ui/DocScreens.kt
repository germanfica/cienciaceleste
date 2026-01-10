package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.germanfica.cienciaceleste.data.*
import com.germanfica.cienciaceleste.ui.theme.AzulTexto

@Composable
fun RolloDetalleScreen(nav: NavController, repo: Repository, id: Int) {
    DocScreen(topImageUrl = RemoteConfig.TOPLONG, load = { repo.getRollo(id) })
}

@Composable
fun MinirolloDetalleScreen(nav: NavController, repo: Repository, id: Int) {
    DocScreen(topImageUrl = RemoteConfig.TOPLONG3, load = { repo.getMinirollo(id) })
}

@Composable
private fun DocScreen(
    topImageUrl: String,
    load: suspend () -> Doc
) {
    var doc by remember { mutableStateOf<Doc?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        error = null
        doc = null
        try {
            doc = load()
        } catch (t: Throwable) {
            error = t.message ?: "Error"
        }
    }

    FrameScaffold(topImageUrl = topImageUrl) {
        when {
            error != null -> Text("Error: $error")
            doc == null -> Text("Cargando...")
            else -> DocRenderer(doc!!)
        }
    }
}

val paragraphStyle = TextStyle(
    fontSize = 16.sp,
    textAlign = TextAlign.Justify
    // Si tu versión de Compose lo soporta, esto mejora el justificado:
    // , lineBreak = LineBreak.Paragraph
    // , hyphens = Hyphens.Auto
    // , localeList = LocaleList("es")
)

@Composable
fun Paragraph(text: String) {
    val cleaned = text.normalizeForJustify()
    if (cleaned.isNotBlank()) {
        Text(
            text = cleaned,
            style = paragraphStyle,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(50.dp).background(Color.Red))
    }
}

private fun String.splitParagraphs(): List<String> =
    this
        .replace('\u00A0', ' ')
        .split(Regex("\\r?\\n\\s*\\r?\\n|\\r?\\n"))
        .map { it.trim() }
        .filter { it.isNotBlank() }


@Composable
fun ParagraphBlock(text: String) {
    Text(
        text = text,
        style = paragraphStyle,
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun DocRenderer(d: Doc) {
    // titulo (similar a tu h1)
    if (!d.titulo.isNullOrBlank()) {
        Text(d.titulo!!, fontSize = 20.sp, color = AzulTexto, textAlign = TextAlign.Justify)
        Spacer(Modifier.height(12.dp))
    }

    d.bloques.forEach { b ->
        when (b.t) {
            "h1", "h2", "h3" -> {
                Text(b.text.orEmpty(), fontSize = 18.sp, color = AzulTexto, textAlign = TextAlign.Justify)
                Spacer(Modifier.height(10.dp))
            }
            "p" -> {
                val raw = inlinesToPlainText(b.inlines)
                val parts = raw.splitParagraphs()

                parts.forEachIndexed { index, p ->
                    ParagraphBlock(p.normalizeForJustify())
                    if (index < parts.lastIndex) {
                        Spacer(Modifier.height(50.dp))
                    }
                }
            }



            "img" -> {
                val url = resolveImg(b.src)
                if (url != null) {
                    AsyncImage(model = url, contentDescription = b.alt, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(14.dp))
                }
            }
            "blockquote" -> {
                Text(inlinesToPlainText(b.inlines), fontSize = 16.sp, textAlign = TextAlign.Justify)
                Spacer(Modifier.height(10.dp))
            }
            "ul", "ol" -> {
                b.items.orEmpty().forEach { line ->
                    Text("• " + inlinesToPlainText(line), fontSize = 16.sp, textAlign = TextAlign.Justify)
                    Spacer(Modifier.height(6.dp))
                }
                Spacer(Modifier.height(10.dp))
            }
            "code" -> {
                Text(b.code.orEmpty(), fontSize = 14.sp, textAlign = TextAlign.Justify)
                Spacer(Modifier.height(10.dp))
            }
        }
    }

    if (!d.autor.isNullOrBlank()) {
        Spacer(Modifier.height(16.dp))
        Text("Escribe: ${d.autor}", fontSize = 16.sp, textAlign = TextAlign.Justify)
    }
}

private fun inlinesToPlainText(inlines: List<Inline>?): String =
    inlines.orEmpty().joinToString("") { it.text }

private fun resolveImg(src: String?): String? {
    if (src.isNullOrBlank()) return null
    return if (src.startsWith("http")) src else (RemoteConfig.BASE_IMG + src.trimStart('/'))
}

private fun String.normalizeForJustify(): String =
    this
        .replace('\u00A0', ' ')
        .replace(Regex("[\\t\\r\\n]+"), " ")
        .replace(Regex(" {2,}"), " ")
        .trim()
