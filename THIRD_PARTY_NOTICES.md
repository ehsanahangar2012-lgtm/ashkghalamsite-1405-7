# Third-party references and attribution

## PackBox Studio

Repository: https://github.com/sbarrak/packbox  
License: MIT (see the upstream `LICENSE` file).

The RSC/FEFCO 0201 geometry update in `src/services/dielineMath.ts` adapts the general parametric panel/flap approach used in PackBox Studio: model the four body panels separately and derive each wall's flap depth from the perpendicular box dimension. This project does not import PackBox Studio as a runtime dependency. The implementation has been adapted to this repository's existing SVG path engine and must be independently checked against production samples before manufacturing.

Upstream MIT notice:

Copyright (c) 2026 sbarrak

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## OpenDieline

Reference: https://github.com/GIGAJOHUB/OpenDieline

The repository was reviewed for its millimetre-based parametric geometry, separated cut/fold paths, and vector export architecture. No license file was found during this review, so its source code has **not** been copied into this project. It remains a design/engineering reference until a license permitting reuse is confirmed.

## Packmage

Reference: https://www.packmage.com/Cad/ForBrowser

Packmage was reviewed as a commercial product reference for box-type selection, parametric dimension entry, and immediate visual feedback. No Packmage source code has been copied into this project.
