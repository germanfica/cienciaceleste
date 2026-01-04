package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.germanfica.cienciaceleste.data.RemoteConfig
import com.germanfica.cienciaceleste.ui.theme.Blanco
import com.germanfica.cienciaceleste.ui.theme.Celeste

@Composable
fun FrameScaffold(
    topImageUrl: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Celeste)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        AsyncImage(
            model = topImageUrl,
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 1.dp),
            contentScale = ContentScale.FillWidth
        )

        // "Marco" (si queres, aca despues lo reemplazas por un tiled shader con fondolong.jpg)
        Box(
            modifier = Modifier
                .fillMaxWidth(),
            contentAlignment = Alignment.TopCenter
        ) {
            // Fondo: por ahora lo estiramos (simple). Si queres repetido vertical, te paso la version con ImageShader.
            AsyncImage(
                model = RemoteConfig.FONDO_LONG,
                contentDescription = null,
                modifier = Modifier.fillMaxWidth(),
                contentScale = ContentScale.FillWidth
            )

            // Caja blanca centrada (tipo clamp)
            Column(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .fillMaxWidth()
                    .widthIn(max = 1000.dp)
                    .padding(horizontal = 10.dp)
                    .background(Blanco)
                    .padding(16.dp)
            ) {
                content()
            }
        }

        Footer()

        // Bottom decor
        AsyncImage(
            model = RemoteConfig.BOTTOM_ONLY,
            contentDescription = null,
            modifier = Modifier.fillMaxWidth(),
            contentScale = ContentScale.FillWidth
        )
    }
}
