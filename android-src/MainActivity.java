package PACKAGE_NAME;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

// Limbo's main screen. It hides the Android status bar (clock, signal, battery) and the navigation buttons as soon as the game opens (immersive mode).
// The GitHub Action (.github/workflows/main.yml) copies this file over the MainActivity that "npx cap add android" generates,
// and replaces PACKAGE_NAME with the app's real package name.
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemBars();
  }

  // Coming back from a call, the app switcher or a swipe-down: hide the bars again.
  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus)
      hideSystemBars();
  }

  private void hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);      // the game draws behind the (hidden) bars, full screen
    if (Build.VERSION.SDK_INT >= 28) {      // also draw around a camera notch / punch-hole
      WindowManager.LayoutParams lp = getWindow().getAttributes();
      lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
      getWindow().setAttributes(lp);
    }
    WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);      // a swipe from the edge shows them for a moment
    c.hide(WindowInsetsCompat.Type.systemBars());
  }
}
