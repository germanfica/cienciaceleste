package com.germanfica.cienciaceleste

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
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
import com.germanfica.cienciaceleste.ui.*
import com.germanfica.cienciaceleste.ui.theme.CienciaCelesteTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repo = Repository(Network.api)

        setContent {
            CienciaCelesteTheme {
                val nav = rememberNavController()
                val drawerState = rememberDrawerState(DrawerValue.Closed)
                val scope = rememberCoroutineScope()

                val backStackEntry by nav.currentBackStackEntryAsState()
                val currentRoute = backStackEntry?.destination?.route

                fun navigateFromDrawer(route: String) {
                    nav.navigate(route) {
                        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }

                ModalNavigationDrawer(
                    drawerState = drawerState,
                    drawerContent = {
                        AppDrawer(
                            currentRoute = currentRoute,
                            onNavigate = { route ->
                                scope.launch { drawerState.close() }
                                navigateFromDrawer(route)
                            }
                        )
                    }
                ) {
                    Scaffold { padding ->
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
                                modifier = Modifier
                                    .align(Alignment.TopStart)
                                    .windowInsetsPadding(WindowInsets.statusBars)
                                    //.padding(padding)
                                    //.padding(16.dp)
                                    .padding(
                                        start = 16.dp,
                                        end = 16.dp,
                                        bottom = 16.dp
                                    )
                                //.windowInsetsPadding(WindowInsets.statusBars)
                                //.padding(start = 16.dp, top = 12.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    private fun titleForRoute(route: String?): String {
        return when {
            route == null -> "Ciencia Celeste"
            route == "home" -> "Ciencia Celeste"
            route.startsWith("divinasLeyes") -> "Divinas leyes"
            route.startsWith("rollos") || route.startsWith("rollo") -> "Divinos rollos telepaticos"
            route.startsWith("minirollos") || route.startsWith("minirollo") -> "Divinos mini rollos"
            else -> "Ciencia Celeste"
        }
    }
}