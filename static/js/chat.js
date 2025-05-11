// chat.js - Обработка чата
document.addEventListener('DOMContentLoaded', function() {
    console.log("Инициализация скрипта чата...");
    
    // Конфигурация MathJax для рендеринга LaTeX
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\(', '\)']],
            displayMath: [['$$', '$$'], ['\[', '\]']],
            processEscapes: true,
            packages: ['base', 'ams', 'noerrors', 'noundefined']
        },
        svg: {
            fontCache: 'global'
        },
        options: {
            enableMenu: false,  // Отключаем контекстное меню для упрощения интерфейса
            renderActions: {
                addMenu: [], // Убираем меню для каждой формулы
                checkLoading: []
            }
        },
        startup: {
            pageReady: () => {
                console.log('MathJax is ready');
                return MathJax.startup.defaultPageReady();
            }
        }
    };
    
    // Загружаем MathJax
    if (!document.getElementById('MathJax-script')) {
        const script = document.createElement('script');
        script.id = 'MathJax-script';
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true;
        document.head.appendChild(script);
    }
    
    // Элементы DOM
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const smartModeToggle = document.getElementById('smart-mode-toggle');
    
    // Проверяем, что все элементы найдены
    if (!chatMessages) console.error("Элемент #chat-messages не найден");
    if (!chatInput) console.error("Элемент #chat-input не найден");
    if (!sendButton) console.error("Элемент #send-button не найден");
    
    console.log("Элементы интерфейса:", { 
        chatMessages: !!chatMessages, 
        chatInput: !!chatInput, 
        sendButton: !!sendButton,
        smartModeToggle: !!smartModeToggle
    });
    
    // Получаем CSRF-токен из cookie
    function getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }
    
    const csrftoken = getCSRFToken();
    console.log("CSRF-токен получен:", csrftoken ? "Да" : "Нет");
    
    // Флаги состояния
    let isWaitingForResponse = false;
    let isSmartMode = false;
    
    // ID чата для сохранения истории
    let chatId = '';
    try {
        // Пытаемся получить ID чата из страницы
        const chatIdElement = document.getElementById('chat-id');
        if (chatIdElement) {
            chatId = chatIdElement.value;
            console.log("Получен ID чата со страницы:", chatId);
        }
    } catch (e) {
        console.error("Ошибка при получении ID чата:", e);
    }
    
    // История сообщений
    let messagesHistory = [
        {role: "assistant", content: "Здравствуйте! Я ваш математический помощник. Могу объяснить математические концепции, помочь решить задачи и подготовиться к контрольным работам. Не стесняйтесь задавать вопросы о любой теме: алгебра, геометрия, математический анализ и др. Чем могу помочь сегодня?"}
    ];
    
    // Пытаемся загрузить историю сообщений из localStorage
    try {
        const savedHistory = localStorage.getItem('mathChatHistory');
        if (savedHistory) {
            messagesHistory = JSON.parse(savedHistory);
            
            // Очищаем текущие сообщения в чате
            if (chatMessages) {
                chatMessages.innerHTML = '';
                
                // Восстанавливаем сообщения из истории
                messagesHistory.forEach(msg => {
                    const sender = msg.role === 'assistant' ? 'ai' : 'user';
                    appendMessage(msg.content, sender, false); // false означает, что не нужно сохранять в историю
                });
            }
        }
    } catch (e) {
        console.error('Ошибка при загрузке истории:', e);
    }
    
    // Функция для сохранения истории в localStorage
    function saveHistory() {
        try {
            localStorage.setItem('mathChatHistory', JSON.stringify(messagesHistory));
        } catch (e) {
            console.error('Ошибка при сохранении истории:', e);
        }
    }
    
    // Функция отправки сообщения
    function handleSendMessage() {
        console.log("Функция handleSendMessage вызвана");
        
        const messageText = chatInput.value.trim();
        if (messageText === '' || isWaitingForResponse) {
            console.log("Сообщение пустое или ожидается ответ, отмена отправки");
            return;
        }
        
        console.log("Отправка сообщения:", messageText);
        
        // Добавляем сообщение пользователя в чат
        appendMessage(messageText, 'user');
        
        // Сохраняем в историю
        messagesHistory.push({role: "user", content: messageText});
        
        // Очищаем поле ввода
        chatInput.value = '';
        
        // Блокируем интерфейс на время ожидания ответа
        isWaitingForResponse = true;
        if (chatInput) chatInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        
        // Добавляем индикатор загрузки
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'ai-message');
        loadingDiv.textContent = 'Обдумываю ваш вопрос';
        loadingDiv.id = 'loading-message';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        console.log("Отправляем запрос на сервер с ID чата:", chatId);
        
        // Отправляем запрос на сервер
        fetch('/api/process-message/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                message: messageText,
                history: messagesHistory,
                smartMode: isSmartMode,
                chatId: chatId // Передаем ID чата
            })
        })
        .then(response => {
            console.log("Получен ответ от сервера, статус:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Получен ответ от сервера:", data);
            
            // Удаляем индикатор загрузки
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            // Проверяем наличие ошибки
            if (data.error) {
                console.error("Ошибка от сервера:", data.error);
                appendMessage('Произошла ошибка: ' + data.error, 'ai');
            } else {
                // Добавляем ответ в чат и историю
                appendMessage(data.response, 'ai');
                messagesHistory.push({role: "assistant", content: data.response});
                
                // Обновляем ID чата, если он был создан на сервере
                if (data.chatId) {
                    console.log("Обновляем ID чата:", data.chatId);
                    chatId = data.chatId;
                }
            }
            
            // Сохраняем обновленную историю
            saveHistory();
            
            // Разблокируем интерфейс
            isWaitingForResponse = false;
            if (chatInput) chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            
            // Фокус на поле ввода
            if (chatInput) chatInput.focus();
        })
        .catch(error => {
            console.error("Ошибка при отправке сообщения:", error);
            
            // Удаляем индикатор загрузки
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            // Выводим сообщение об ошибке
            appendMessage('Произошла ошибка при обработке запроса.', 'ai');
            
            // Разблокируем интерфейс
            isWaitingForResponse = false;
            if (chatInput) chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
        });
    }
    
    function appendMessage(text, sender, shouldScroll = true) {
        if (!chatMessages) {
            console.error("Не удалось добавить сообщение: элемент чата не найден");
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender + '-message');
        
        // Для всех сообщений (и от AI, и от пользователя) используем innerHTML и предварительную обработку
        // Обрабатываем специальные теги для построения графиков
        let formattedText = text;
        
        // Проверяем наличие команд для построения графиков (только для сообщений от AI)
        if (sender === 'ai') {
            const graphRegex = /\[\[GRAPH:(.*?)\]\]/g;
            let match;
            let graphIndex = 0;
            
            // Заменяем команды графиков на контейнеры для их отображения
            while ((match = graphRegex.exec(formattedText)) !== null) {
                const graphId = `graph-${Date.now()}-${graphIndex++}`;
                const graphData = match[1].trim();
                
                // Создаем заполнитель для графика
                const graphPlaceholder = `<div class="graph-container" id="${graphId}"></div>
                                          <div class="graph-controls">
                                              <button class="graph-button zoom-reset" data-graph-id="${graphId}">Сбросить масштаб</button>
                                              <button class="graph-button download-graph" data-graph-id="${graphId}">Скачать изображение</button>
                                          </div>`;
                
                // Заменяем команду графика на контейнер
                formattedText = formattedText.replace(match[0], graphPlaceholder);
                
                // Добавляем задачу для создания графика после рендеринга сообщения
                setTimeout(() => {
                    try {
                        const graphConfig = JSON.parse(graphData);
                        renderGraph(graphId, graphConfig);
                    } catch (e) {
                        console.error('Ошибка при парсинге данных графика:', e);
                        document.getElementById(graphId).innerHTML = 
                            '<div style="color: red; padding: 20px;">Ошибка при построении графика</div>';
                    }
                }, 0);
            }
        }
        
        // Заменяем переносы строк на <br> для лучшей читаемости
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        // Создаем безопасный контейнер для обработки MathJax
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = formattedText;
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        
        // Прокрутка вниз
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Перерендеринг LaTeX для всех сообщений, если MathJax загружен
        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([messageDiv]).then(() => {
                // После рендеринга LaTeX снова проверяем, нужна ли прокрутка
                if (shouldScroll) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                // Добавляем обработчики для кнопок графиков
                if (sender === 'ai') {
                    messageDiv.querySelectorAll('.zoom-reset').forEach(button => {
                        button.addEventListener('click', function() {
                            const graphId = this.getAttribute('data-graph-id');
                            const graphDiv = document.getElementById(graphId);
                            if (graphDiv && graphDiv._plotly) {
                                Plotly.relayout(graphId, {
                                    'xaxis.autorange': true,
                                    'yaxis.autorange': true
                                });
                            }
                        });
                    });
                    
                    messageDiv.querySelectorAll('.download-graph').forEach(button => {
                        button.addEventListener('click', function() {
                            const graphId = this.getAttribute('data-graph-id');
                            const graphDiv = document.getElementById(graphId);
                            if (graphDiv && graphDiv._plotly) {
                                Plotly.downloadImage(graphId, {
                                    format: 'png',
                                    filename: 'график-' + Date.now()
                                });
                            }
                        });
                    });
                }
            }).catch(function (err) {
                console.error('MathJax typesetting error: ' + err.message);
            });
        } else {
            console.warn('MathJax не загружен, формулы не будут обработаны');
        }
    }
    
    // Функция для рендеринга графика
    function renderGraph(graphId, graphConfig) {
        const graphDiv = document.getElementById(graphId);
        if (!graphDiv) {
            console.error('Контейнер для графика не найден:', graphId);
            return;
        }
        
        // Проверяем, загружена ли библиотека Plotly
        if (!window.Plotly) {
            console.error('Библиотека Plotly не загружена. Загружаем...');
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.29.1.min.js';
            script.onload = function() {
                console.log('Plotly загружен, рендерим график');
                renderPlotlyGraph(graphId, graphConfig);
            };
            document.head.appendChild(script);
        } else {
            renderPlotlyGraph(graphId, graphConfig);
        }
    }
    
    function renderPlotlyGraph(graphId, graphConfig) {
        const graphDiv = document.getElementById(graphId);
        if (!graphDiv) return;
        
        try {
            const traces = graphConfig.traces || [];
            const layout = graphConfig.layout || {
                title: 'График функции',
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                autosize: true,
                margin: { l: 50, r: 30, t: 50, b: 50 }
            };
            
            // Добавляем дополнительные настройки для улучшения внешнего вида
            const config = {
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: [
                    'sendDataToCloud',
                    'select2d',
                    'lasso2d',
                    'toggleSpikelines'
                ]
            };
            
            Plotly.newPlot(graphId, traces, layout, config);
            
            // Добавляем обработчик клика для показа координат
            graphDiv.on('plotly_click', function(data) {
                if (data.points && data.points.length > 0) {
                    const point = data.points[0];
                    let coordInfo = '';
                    
                    // Для 2D графиков
                    if (point.x !== undefined && point.y !== undefined && point.z === undefined) {
                        coordInfo = `Координаты: (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`;
                    } 
                    // Для 3D графиков
                    else if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
                        coordInfo = `Координаты: (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`;
                    }
                    
                    // Показываем всплывающую подсказку
                    if (coordInfo) {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'coord-tooltip';
                        tooltip.textContent = coordInfo;
                        tooltip.style.position = 'absolute';
                        tooltip.style.top = '10px';
                        tooltip.style.right = '10px';
                        tooltip.style.padding = '5px 10px';
                        tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
                        tooltip.style.color = 'white';
                        tooltip.style.borderRadius = '4px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.zIndex = '10';
                        tooltip.style.opacity = '0';
                        tooltip.style.transition = 'opacity 0.3s';
                        
                        // Удаляем предыдущую подсказку, если она есть
                        const oldTooltip = graphDiv.querySelector('.coord-tooltip');
                        if (oldTooltip) {
                            oldTooltip.remove();
                        }
                        
                        graphDiv.appendChild(tooltip);
                        
                        // Показываем подсказку с небольшой задержкой
                        setTimeout(() => {
                            tooltip.style.opacity = '1';
                        }, 10);
                        
                        // Скрываем подсказку через 3 секунды
                        setTimeout(() => {
                            tooltip.style.opacity = '0';
                            setTimeout(() => {
                                tooltip.remove();
                            }, 300);
                        }, 3000);
                    }
                }
            });
            
            // Прокрутка к графику для его отображения
            graphDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            console.error('Ошибка при рендеринге графика:', e);
            graphDiv.innerHTML = '<div style="color: red; padding: 20px;">Ошибка при построении графика</div>';
        }
    }
    
    // Привязываем обработчики событий
    if (sendButton) {
        console.log("Привязываем обработчик клика к кнопке отправки");
        sendButton.addEventListener('click', function(event) {
            console.log("Клик по кнопке отправки");
            handleSendMessage();
        });
    }
    
    if (chatInput) {
        console.log("Привязываем обработчик нажатия Enter к полю ввода");
        chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                console.log("Нажат Enter в поле ввода");
                handleSendMessage();
            }
        });
    }
    
    // Инициализируем дополнительные элементы управления, если они есть
    
    // Обработчик для кнопки очистки истории
    const clearHistoryButton = document.getElementById('clear-history');
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите очистить историю диалога?')) {
                localStorage.removeItem('mathChatHistory');
                location.reload(); // Перезагружаем страницу для сброса чата
            }
        });
    }
    
    // Скрываем лоадер после загрузки страницы
    const pageLoader = document.getElementById('page-loader');
    if (pageLoader) {
        pageLoader.classList.add('hidden');
    }
    
    // Обработчик для переключения полноэкранного режима
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const chatContainer = document.getElementById('chat-container');
    const chatControls = document.getElementById('chat-controls');
    
    if (fullscreenToggle && chatContainer && chatControls) {
        fullscreenToggle.addEventListener('click', function() {
            chatContainer.classList.toggle('fullscreen');
            chatControls.classList.toggle('fullscreen');
            
            const isFullscreen = chatContainer.classList.contains('fullscreen');
            const icon = fullscreenToggle.querySelector('i');
            const text = fullscreenToggle.querySelector('span');
            
            if (isFullscreen) {
                icon.className = 'fas fa-compress';
                text.textContent = 'Выход из полноэкранного режима';
                
                // Прокрутка к началу чата после перехода в полноэкранный режим
                setTimeout(() => {
                    chatMessages.scrollTop = 0;
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                }, 300);
            } else {
                icon.className = 'fas fa-expand';
                text.textContent = 'На весь экран';
                
                // Прокрутка чата вниз после выхода из полноэкранного режима
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 300);
            }
        });
    }
    
    // Показываем подсказку новым пользователям
    const inputHint = document.querySelector('.input-hint');
    if (inputHint) {
        // Если это первый визит (нет истории), показываем подсказку
        if (!localStorage.getItem('mathChatHistory')) {
            setTimeout(() => {
                inputHint.classList.add('visible');
            }, 1500);
            
            // Скрываем подсказку при фокусе на поле ввода
            if (chatInput) {
                chatInput.addEventListener('focus', () => {
                    inputHint.classList.remove('visible');
                });
            }
        }
    }
    
    // Автофокус на поле ввода после загрузки
    if (chatInput) {
        setTimeout(() => {
            chatInput.focus();
        }, 500);
    }
    
    // Управление кнопкой прокрутки вверх
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn && chatMessages) {
        // Показываем/скрываем кнопку при прокрутке
        chatMessages.addEventListener('scroll', function() {
            if (chatMessages.scrollTop > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });
        
        // Прокрутка к началу при клике на кнопку
        scrollTopBtn.addEventListener('click', function() {
            chatMessages.scrollTop = 0;
        });
    }
    
    // Обработчик для переключения умного режима
    if (smartModeToggle) {
        smartModeToggle.addEventListener('click', function() {
            isSmartMode = !isSmartMode;
            this.classList.toggle('active');
            
            const icon = this.querySelector('i');
            const text = this.querySelector('span');
            
            if (isSmartMode) {
                icon.className = 'fas fa-brain';
                text.textContent = 'Умный режим (вкл)';
                this.classList.add('active');
            } else {
                icon.className = 'fas fa-brain';
                text.textContent = 'Умный режим';
                this.classList.remove('active');
            }
            
            console.log("Умный режим " + (isSmartMode ? "включен" : "выключен"));
        });
    }
    
    // Обработчик для кнопки переключения LaTeX панели
    const toggleLatexButton = document.getElementById('toggle-latex');
    const latexToolbar = document.querySelector('.latex-toolbar');
    const formulaPreview = document.getElementById('formula-preview');
    
    if (toggleLatexButton && latexToolbar) {
        toggleLatexButton.addEventListener('click', function() {
            console.log("Переключение панели LaTeX");
            latexToolbar.classList.toggle('collapsed');
        });
    }
    
    // Обработчики для кнопок LaTeX формул
    document.querySelectorAll('.latex-button').forEach(button => {
        button.addEventListener('click', function() {
            if (!chatInput) return;
            
            const latex = this.getAttribute('data-latex');
            const movePosition = parseInt(this.getAttribute('data-move') || '0');
            
            // Запоминаем текущую позицию курсора
            const startPos = chatInput.selectionStart;
            const endPos = chatInput.selectionEnd;
            
            // Добавляем LaTeX код в поле ввода
            const currentValue = chatInput.value;
            const newValue = currentValue.substring(0, startPos) + latex + currentValue.substring(endPos);
            chatInput.value = newValue;
            
            // Перемещаем курсор внутрь формулы, если указано смещение
            if (movePosition) {
                const newCursorPos = startPos + latex.length + movePosition;
                chatInput.setSelectionRange(newCursorPos, newCursorPos);
            } else {
                const newCursorPos = startPos + latex.length;
                chatInput.setSelectionRange(newCursorPos, newCursorPos);
            }
            
            // Фокус на поле ввода
            chatInput.focus();
            
            // Обновляем предпросмотр, если он есть
            if (formulaPreview) {
                updateLatexPreview();
            }
        });
    });
    
    // Функция обновления предпросмотра LaTeX формулы
    function updateLatexPreview() {
        if (!chatInput || !formulaPreview) return;
        
        const inputText = chatInput.value;
        const hasLatex = /\$\$|\$|\\\(|\\\)|\\\[|\\\]/.test(inputText);
        
        if (hasLatex) {
            formulaPreview.classList.add('active');
            formulaPreview.innerHTML = inputText;
            
            // Рендерим LaTeX в предпросмотре
            if (window.MathJax && window.MathJax.typesetPromise) {
                MathJax.typesetPromise([formulaPreview]).catch(function(err) {
                    console.error('Ошибка при рендеринге LaTeX в предпросмотре:', err);
                });
            }
        } else {
            formulaPreview.classList.remove('active');
        }
    }
    
    // Обновление предпросмотра при вводе
    if (chatInput && formulaPreview) {
        chatInput.addEventListener('input', updateLatexPreview);
    }
    
    console.log("Инициализация скрипта чата завершена");
}); 