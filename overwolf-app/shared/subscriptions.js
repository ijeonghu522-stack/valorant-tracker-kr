/* Pro($20/월) 권한 확인.
 * 정식 경로: Tebex 스토어 + Overwolf Subscriptions API (스토어 정책상 자체 결제는 승인 불가).
 * 아래 overwolf API명은 샘플앱 기준으로 감싼 것이며, DevRel 승인 후 실제 메서드명으로 확정한다.
 * (참고: https://dev.overwolf.com/ow-native/monetization/subscriptions/app-subscriptions-api/)
 * Riot 정책: 게임 중 오버레이에서는 구독 유도/결제 CTA를 표시하면 안 된다. */
(function () {
  'use strict';

  var DEV_PRO_KEY = 'vlt_dev_pro'; // 개발 중 Pro 화면 테스트용 플래그
  var cache = { pro: false, at: 0 };
  var TTL = 5 * 60 * 1000;

  function hasOverwolfSubsApi() {
    try {
      return !!(overwolf.profile && overwolf.profile.subscriptions);
    } catch (e) { return false; }
  }

  function checkOverwolfSubs(cb) {
    try {
      var api = overwolf.profile.subscriptions;
      if (api.getActiveSubscriptions) {
        api.getActiveSubscriptions(function (res) {
          if (res && res.status === 'success' && res.subscriptions && res.subscriptions.length > 0) {
            return cb(null, true);
          }
          return cb(null, false);
        });
      } else if (api.getInfo) {
        api.getInfo(function (res) {
          var active = res && res.status === 'success' && res.info && res.info.active;
          cb(null, !!active);
        });
      } else {
        cb(new Error('subscriptions-api-missing'));
      }
    } catch (e) { cb(e); }
  }

  function checkBackendMirror(cb) {
    // 백엔드가 Tebex 웹훅 미러를 들고 있을 경우 보조 확인
    try {
      overwolf.storage.local.get('vlt_user_id', function (res) {
        var uid = res && res.vlt_user_id;
        if (!uid) return cb(null, false);
        fetch('http://localhost:8787/api/entitlement?user=' + encodeURIComponent(uid))
          .then(function (r) { return r.json(); })
          .then(function (j) { cb(null, !!(j && j.pro)); })
          .catch(function () { cb(null, false); });
      });
    } catch (e) { cb(null, false); }
  }

  function isPro(cb) {
    var now = Date.now();
    if (now - cache.at < TTL) return cb(null, cache.pro);
    // 개발 플래그 (출시 빌드에서는 무시되도록 서버에서 재확인)
    overwolf.storage.local.get(DEV_PRO_KEY, function (dr) {
      if (dr && dr[DEV_PRO_KEY] === '1') {
        cache = { pro: true, at: now };
        return cb(null, true);
      }
      if (hasOverwolfSubsApi()) {
        checkOverwolfSubs(function (err, pro) {
          if (!err && pro) { cache = { pro: true, at: now }; return cb(null, true); }
          checkBackendMirror(function (_, pro2) {
            cache = { pro: !!pro2, at: now };
            cb(null, !!pro2);
          });
        });
      } else {
        checkBackendMirror(function (_, pro2) {
          cache = { pro: !!pro2, at: now };
          cb(null, !!pro2);
        });
      }
    });
  }

  // Pro 전용 UI 가드: data-pro-only 요소 표시/숨김
  function applyProGating(root, pro) {
    (root || document).querySelectorAll('[data-pro-only]').forEach(function (el) {
      if (pro) { el.classList.remove('locked'); }
      else { el.classList.add('locked'); }
    });
  }

  window.Subs = { isPro: isPro, applyProGating: applyProGating };
})();
