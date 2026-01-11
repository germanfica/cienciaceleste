package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ShortText
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.automirrored.outlined.ShortText

@Composable
fun SimpleAppBar(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .size(48.dp)
            //.size(50.dp)
            //.size(56.dp)
            .clip(CircleShape),
        shape = CircleShape,
        //color = MaterialTheme.colorScheme.surface.copy(alpha = 0.18f),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)),
        shadowElevation = 0.dp
    ) {
        IconButton(onClick = onClick) {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.ShortText,
                contentDescription = "Abrir menu",
                //tint = Color(0xFFE3E3E3)
                tint = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
