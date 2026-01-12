package com.germanfica.cienciaceleste

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.germanfica.cienciaceleste.data.Network
import com.germanfica.cienciaceleste.data.Repository
import com.germanfica.cienciaceleste.ui.AppDrawer
import com.germanfica.cienciaceleste.ui.DivinasLeyesScreen
import com.germanfica.cienciaceleste.ui.HomeScreen
import com.germanfica.cienciaceleste.ui.MinirolloDetalleScreen
import com.germanfica.cienciaceleste.ui.MinirollosScreen
import com.germanfica.cienciaceleste.ui.RolloDetalleScreen
import com.germanfica.cienciaceleste.ui.RollosScreen
import com.germanfica.cienciaceleste.ui.Route
import com.germanfica.cienciaceleste.ui.SimpleAppBar
import com.germanfica.cienciaceleste.ui.theme.CienciaCelesteTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repo = Repository(Network.api)

        setContent {
            val systemDark = isSystemInDarkTheme()
            var darkTheme by rememberSaveable { mutableStateOf(systemDark) }

            CienciaCelesteTheme(darkTheme = darkTheme) {
                val nav = rememberNavController()
                val drawerState = rememberDrawerState(DrawerValue.Closed)
                val scope = rememberCoroutineScope()

                // Estado hoisted del expand del buscador (para hit area + BackHandler)
                var drawerSearchExpanded by rememberSaveable { mutableStateOf(false) }

                // Evento para pedirle al drawer que colapse el search y limpie foco
                var collapseSearchNonce by rememberSaveable { mutableIntStateOf(0) }

                val expandHitArea = (drawerState.targetValue == DrawerValue.Open) && drawerSearchExpanded

                val backStackEntry by nav.currentBackStackEntryAsState()
                val currentRoute = backStackEntry?.destination?.route

                val drawerVisible =
                    drawerState.currentValue == DrawerValue.Open || drawerState.targetValue == DrawerValue.Open

                ModalNavigationDrawer(
                    drawerState = drawerState,
                    drawerContent = {
                        AppDrawer(
                            currentRoute = currentRoute,
                            onNavigate = { route ->
                                scope.launch { drawerState.close() }
                                nav.navigate(route) {
                                    popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            isDarkTheme = darkTheme,
                            onToggleTheme = { darkTheme = !darkTheme },
                            searchExpanded = drawerSearchExpanded,
                            onSearchExpandedChange = { drawerSearchExpanded = it },
                            collapseSearchNonce = collapseSearchNonce
                        )
                    }
                ) {
                    Scaffold { _ ->
                        Box(modifier = Modifier.fillMaxSize()) {
                            NavHost(navController = nav, startDestination = Route.Home.path) {
                                composable(Route.Home.path) { HomeScreen(nav) }

                                composable(
                                    Route.DivinasLeyes.path,
                                    arguments = listOf(navArgument("page") { type = NavType.IntType })
                                ) { backStack ->
                                    val page = backStack.arguments?.getInt("page") ?: 1
                                    DivinasLeyesScreen(nav, repo, page)
                                }

                                composable(
                                    Route.Rollos.path,
                                    arguments = listOf(navArgument("page") { type = NavType.IntType })
                                ) { backStack ->
                                    val page = backStack.arguments?.getInt("page") ?: 1
                                    RollosScreen(nav, repo, page)
                                }

                                composable(
                                    Route.Minirollos.path,
                                    arguments = listOf(navArgument("page") { type = NavType.IntType })
                                ) { backStack ->
                                    val page = backStack.arguments?.getInt("page") ?: 1
                                    MinirollosScreen(nav, repo, page)
                                }

                                composable(
                                    Route.RolloDetalle.path,
                                    arguments = listOf(navArgument("id") { type = NavType.IntType })
                                ) { backStack ->
                                    val id = backStack.arguments?.getInt("id") ?: 1
                                    RolloDetalleScreen(nav, repo, id)
                                }

                                composable(
                                    Route.MinirolloDetalle.path,
                                    arguments = listOf(navArgument("id") { type = NavType.IntType })
                                ) { backStack ->
                                    val id = backStack.arguments?.getInt("id") ?: 1
                                    MinirolloDetalleScreen(nav, repo, id)
                                }
                            }

                            SimpleAppBar(
                                onClick = {
                                    scope.launch {
                                        if (drawerState.isClosed) drawerState.open() else drawerState.close()
                                    }
                                },
                                expandHitArea = expandHitArea,
                                modifier = Modifier
                                    .align(Alignment.TopStart)
                                    .windowInsetsPadding(WindowInsets.statusBars)
                                    .padding(
                                        start = 16.dp,
                                        end = 16.dp,
                                        bottom = 16.dp
                                    )
                            )

                            // IMPORTANTE: al final del Box para que gane prioridad sobre el back del NavHost
                            BackHandler(
                                enabled = drawerVisible || drawerSearchExpanded
                            ) {
                                if (drawerSearchExpanded) {
                                    // Back bloqueado: solo colapsa el search
                                    collapseSearchNonce += 1
                                } else {
                                    // Back bloqueado: cierra el drawer
                                    scope.launch { drawerState.close() }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
