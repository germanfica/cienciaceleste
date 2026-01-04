package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
        // Header image
        AsyncImage(
            model = topImageUrl,
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 1.dp),
            contentScale = ContentScale.FillWidth
        )

        // Frame container
        // Later, this should replaced with a tiled shader using fondolong.jpg
        Box(
            modifier = Modifier
                .fillMaxWidth(),
            contentAlignment = Alignment.TopCenter
        ) {
            // Background: currently stretched for simplicity
            // Later, this should use an ImageShader
            AsyncImage(
                model = RemoteConfig.FONDO_LONG,
                contentDescription = null,
                modifier = Modifier.fillMaxWidth(),
                contentScale = ContentScale.FillWidth
            )

            // Centered white content container (clamp-style layout)
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

        // Footer section
        Footer()

        // Bottom decorative image
        AsyncImage(
            model = RemoteConfig.BOTTOM_ONLY,
            contentDescription = null,
            modifier = Modifier.fillMaxWidth(),
            contentScale = ContentScale.FillWidth
        )
    }
}
