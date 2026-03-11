.cover {
  position: relative;
  border-radius: 6px 12px 12px 6px;
  overflow: hidden;
}

.small {
  height: 160px;
}

.full {
  height: 320px;
  max-width: 240px;
  margin: 0 auto;
}

.inner {
  display: flex;
  height: 100%;
}

.spine {
  width: 14px;
  flex-shrink: 0;
  opacity: 0.6;
}

.front {
  flex: 1;
  position: relative;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.topLeft, .topRight, .bottomLeft, .bottomRight {
  position: absolute;
  font-size: 18px;
  opacity: 0.7;
}
.topLeft { top: 8px; left: 18px; }
.topRight { top: 8px; right: 8px; }
.bottomLeft { bottom: 8px; left: 18px; }
.bottomRight { bottom: 8px; right: 8px; }

.small .topLeft, .small .topRight,
.small .bottomLeft, .small .bottomRight {
  font-size: 14px;
}

.centerBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.pineapple {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

.small .pineapple { font-size: 24px; }

.coverTitle {
  color: white;
  font-size: 14px;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
  margin-top: 8px;
  max-width: 90%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line {
  height: 3px;
  width: 100%;
  border-radius: 2px;
}
